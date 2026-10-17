<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'category_id',
    'name',
    'sku',
    'brand',
    'model_number',
    'cost_price',
    'selling_price',
    'quantity',
    'minimum_stock',
])]
class Product extends Model
{
    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}