<?php

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;

Route::post('/login', function (Request $request) {
    $user = User::where('email', $request->email)->first();

    if ($user && Hash::check($request->password, $user->password)) {
        $token = $user->createToken('api-token', ['read:data'])->plainTextToken;
        return response()->json(['token' => $token]);
    }

    return response()->json(['error' => 'Credenciais inválidas'], 401);
});

Route::post('/logout', function (Request $request) {
    $request->user()->currentAccessToken()->delete();
    return response()->json(['message' => 'Token revogado']);
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::group(['middleware' => 'auth:sanctum'], function () {
    Route::apiResource('companies', \App\Http\Controllers\CompanyController::class);
    Route::apiResource('users', \App\Http\Controllers\UserController::class);
});

