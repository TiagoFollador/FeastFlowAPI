<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends Model
{
    use SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'name',
        'cnpj',
        'email',
        'phone',
        'address_street',
        'address_number',
        'address_city',
        'address_state',
        'address_zip_code',
        'logo',
        'status'
    ];

    /**
     * The users that belong to the Company
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }


/**
 * The "booting" method of the model.
 *
 * This method is used to define model events. In this case, it assigns
 * a UUID to the model's 'id' attribute before creating a new Company
 * record, if an 'id' is not already set.
 */

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->id = $model->id ?: \Illuminate\Support\Str::uuid()->toString();
        });
    }
}
