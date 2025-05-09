<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::connection("mysql_users")->create('companies', function (Blueprint $table) {
            // Chave primária UUID
            $table->uuid('id')->primary();
            
            // Dados básicos
            $table->string('name');
            $table->string('cnpj', 14)->unique();
            $table->string('email')->unique();
            $table->string('phone'); 
            
            // Endereço
            $table->string('address_street');
            $table->string('address_number');
            $table->string('address_city');
            $table->char('address_state', 2);
            $table->string('address_zip_code', 8);
            
            // Opcionais
            $table->string('logo')->nullable();
            $table->boolean('status')->default(true);
            
            // Timestamps e soft delete
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('companies', function (Blueprint $table) {
            $table->index('name'); 
            $table->index('cnpj'); 
        });
    }

    /**
     * Reverse the companies table.
     */
    public function down(): void
    {
        Schema::connection("mysql_users")->dropIfExists('companies');
    }

};
