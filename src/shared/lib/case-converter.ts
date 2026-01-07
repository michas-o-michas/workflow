/**
 * Utilitários para conversão entre camelCase (TypeScript) e snake_case (PostgreSQL)
 */

// Função para converter camelCase para snake_case
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

// Função para converter snake_case para camelCase
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

// Converte objeto de camelCase para snake_case
export function convertToSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(convertToSnakeCase)
  if (typeof obj !== 'object') return obj

  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key)
    result[snakeKey] = convertToSnakeCase(value)
  }
  return result
}

// Converte objeto de snake_case para camelCase
export function convertToCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(convertToCamelCase)
  if (typeof obj !== 'object') return obj

  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key)
    result[camelKey] = convertToCamelCase(value)
  }
  return result
}

