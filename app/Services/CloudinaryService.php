<?php

namespace App\Services;

use Cloudinary\Cloudinary;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CloudinaryService
{
    protected ?Cloudinary $cloudinary = null;
    protected string $cloudName;
    protected string $apiKey;
    protected string $apiSecret;

    public function __construct()
    {
        $this->cloudName = config('cloudinary.cloud_name', env('CLOUDINARY_CLOUD_NAME', ''));
        $this->apiKey    = config('cloudinary.api_key', env('CLOUDINARY_API_KEY', ''));
        $this->apiSecret = config('cloudinary.api_secret', env('CLOUDINARY_API_SECRET', ''));

        if (!empty($this->cloudName) && !empty($this->apiKey) && !empty($this->apiSecret)) {
            try {
                $this->cloudinary = new Cloudinary([
                    'cloud' => [
                        'cloud_name' => $this->cloudName,
                        'api_key'    => $this->apiKey,
                        'api_secret' => $this->apiSecret,
                    ],
                    'url' => [
                        'secure' => true,
                    ],
                ]);
            } catch (\Throwable $e) {
                Log::warning('Cloudinary SDK initialization failed: ' . $e->getMessage());
                $this->cloudinary = null;
            }
        }
    }

    /**
     * Upload an image or file to Cloudinary with automatic local fallback.
     *
     * @param UploadedFile|string $file File object, local file path, or remote URL
     * @param string $folder Target folder
     * @param string|null $publicId Optional public ID
     * @return array [ 'url' => ..., 'public_id' => ..., 'source' => 'cloudinary'|'local' ]
     */
    public function uploadImage($file, string $folder = 'electronics_inventory/products', ?string $publicId = null): array
    {
        // 1. Attempt upload to Cloudinary if configured
        if ($this->cloudinary) {
            try {
                $options = [
                    'folder' => $folder,
                    'resource_type' => 'auto',
                    'overwrite' => true,
                ];

                if ($publicId) {
                    $options['public_id'] = $publicId;
                }

                $filePath = $file instanceof UploadedFile ? $file->getRealPath() : $file;
                $result = $this->cloudinary->uploadApi()->upload($filePath, $options);

                if (!empty($result['secure_url'])) {
                    return [
                        'url'       => $result['secure_url'],
                        'public_id' => $result['public_id'] ?? null,
                        'format'    => $result['format'] ?? null,
                        'bytes'     => $result['bytes'] ?? null,
                        'source'    => 'cloudinary',
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning('Cloudinary upload warning: ' . $e->getMessage() . '. Falling back to local storage.');
            }
        }

        // 2. Graceful fallback: Store locally so image access never fails
        return $this->storeLocal($file, $folder);
    }

    /**
     * Fallback to store file in public disk
     */
    protected function storeLocal($file, string $folder): array
    {
        $filename = Str::random(24);

        if ($file instanceof UploadedFile) {
            $ext = $file->getClientOriginalExtension() ?: 'webp';
            $fullName = "{$filename}.{$ext}";
            $path = $file->storeAs('uploads/products', $fullName, 'public');
            $url = "/storage/{$path}";
            
            // Also ensure copy in public/uploads/products for direct server serving
            $publicDir = public_path('storage/uploads/products');
            if (!file_exists($publicDir)) {
                @mkdir($publicDir, 0755, true);
            }
            @copy($file->getRealPath(), "{$publicDir}/{$fullName}");

            return [
                'url'       => $url,
                'public_id' => "local_{$filename}",
                'format'    => $ext,
                'bytes'     => $file->getSize(),
                'source'    => 'local',
            ];
        }

        if (is_string($file)) {
            // If it's already an HTTP / Cloudinary URL, keep it!
            if (str_starts_with($file, 'http://') || str_starts_with($file, 'https://') || str_starts_with($file, '/assets/')) {
                return [
                    'url'       => $file,
                    'public_id' => "remote_{$filename}",
                    'source'    => 'remote',
                ];
            }

            // Local file path
            if (file_exists($file)) {
                $ext = pathinfo($file, PATHINFO_EXTENSION) ?: 'jpg';
                $fullName = "{$filename}.{$ext}";
                $dest = public_path("storage/uploads/products/{$fullName}");
                $dir = dirname($dest);
                if (!file_exists($dir)) {
                    @mkdir($dir, 0755, true);
                }
                @copy($file, $dest);

                return [
                    'url'       => "/storage/uploads/products/{$fullName}",
                    'public_id' => "local_{$filename}",
                    'format'    => $ext,
                    'source'    => 'local',
                ];
            }
        }

        return [
            'url'       => '/ngus-logo.png',
            'public_id' => 'fallback_logo',
            'source'    => 'fallback',
        ];
    }

    /**
     * Delete an asset
     */
    public function deleteFile(?string $publicId, string $resourceType = 'image'): bool
    {
        if (empty($publicId)) {
            return false;
        }

        if ($this->cloudinary && !str_starts_with($publicId, 'local_') && !str_starts_with($publicId, 'remote_')) {
            try {
                $res = $this->cloudinary->uploadApi()->destroy($publicId, ['resource_type' => $resourceType]);
                return ($res['result'] ?? '') === 'ok';
            } catch (\Throwable $e) {
                Log::warning('Cloudinary delete failed: ' . $e->getMessage());
            }
        }

        return true;
    }
}
