import { Transform } from 'class-transformer';
import Decimal from 'decimal.js';

/**
 * Decorador personalizado para transformar valores monetários em Decimal.js
 * 
 * SEGURANÇA FINANCEIRA CRÍTICA:
 * 
 * Este decorador previne o uso acidental de números float/double (IEEE 754)
 * que causam erros de arredondamento financeiro (ex: 0.1 + 0.2 ≠ 0.3)
 * 
 * Aceita entrada em três formatos:
 * 1. String: "1500.00" → Decimal(1500.00)
 * 2. Number: 1500 → Decimal(1500.00)
 * 3. Decimal: Decimal(1500) → Decimal(1500.00) (passthrough)
 * 
 * Configuração de precisão:
 * - Decimal.set({ precision: 20 }) garante 20 dígitos significativos
 * - Alinha com DECIMAL(19,4) do PostgreSQL
 * 
 * @returns Instância de Decimal.js com precisão absoluta
 */
export function ToDecimal() {
  return Transform(({ value }) => {
    if (value === null || value === undefined) {
      return value;
    }

    // Se já é uma instância de Decimal, retorna diretamente
    if (Decimal.isDecimal(value)) {
      return value;
    }

    // Converte string ou number para Decimal
    try {
      // Configura precisão para operações financeiras
      Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });
      return new Decimal(value);
    } catch (error) {
      throw new Error(`Invalid decimal value: ${value}. ${error.message}`);
    }
  });
}

/**
 * Decorador para transformar array de valores em array de Decimals
 */
export function ToDecimalArray() {
  return Transform(({ value }) => {
    if (!Array.isArray(value)) {
      return value;
    }

    return value.map((item) => {
      if (Decimal.isDecimal(item)) {
        return item;
      }
      Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });
      return new Decimal(item);
    });
  });
}
