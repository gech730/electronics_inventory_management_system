<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\Request;

class ContactMessageController extends Controller
{
    /**
     * Store a newly created contact message from the public storefront.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:150',
            'phone' => 'nullable|string|max:50',
            'subject' => 'nullable|string|max:200',
            'message' => 'required|string|min:5|max:3000',
        ]);

        $message = ContactMessage::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'subject' => $validated['subject'] ?? 'General Customer Inquiry',
            'message' => $validated['message'],
            'status' => 'pending',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Your message has been sent to our customer care desk. We will respond promptly.',
            'data' => $message,
        ], 201);
    }

    /**
     * Display a listing of inquiries for Admin/Manager support desk.
     */
    public function index(Request $request)
    {
        $query = ContactMessage::query();

        // Optional status filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Optional search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%")
                  ->orWhere('message', 'like', "%{$search}%");
            });
        }

        $messages = $query->orderBy('created_at', 'desc')->get();

        // Aggregate statistics for quick KPI tiles
        $counts = [
            'total' => ContactMessage::count(),
            'pending' => ContactMessage::where('status', 'pending')->count(),
            'in_progress' => ContactMessage::where('status', 'in_progress')->count(),
            'resolved' => ContactMessage::where('status', 'resolved')->count(),
        ];

        return response()->json([
            'status' => 'success',
            'data' => $messages,
            'counts' => $counts,
        ]);
    }

    /**
     * Update the status or admin notes of an inquiry.
     */
    public function update(Request $request, $id)
    {
        $message = ContactMessage::findOrFail($id);

        $validated = $request->validate([
            'status' => 'nullable|in:pending,in_progress,resolved',
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        if (isset($validated['status'])) {
            $message->status = $validated['status'];
        }

        if (array_key_exists('admin_notes', $validated)) {
            $message->admin_notes = $validated['admin_notes'];
        }

        $message->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Inquiry updated successfully.',
            'data' => $message,
        ]);
    }

    /**
     * Remove the specified inquiry from database.
     */
    public function destroy($id)
    {
        $message = ContactMessage::findOrFail($id);
        $message->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Inquiry deleted successfully.',
        ]);
    }
}

