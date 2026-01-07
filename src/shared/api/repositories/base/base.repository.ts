/**
 * Base Repository - Classe base abstrata para repositories
 * 
 * Fornece métodos CRUD genéricos com conversão automática de case
 * (camelCase ↔ snake_case) para comunicação com Supabase.
 * 
 * @module shared/api/repositories/base/base.repository
 */

import { supabase } from '@/shared/api/supabase'
import { convertToSnakeCase, convertToCamelCase } from '@/shared/lib/case-converter'
import { logger } from '@/shared/lib/logger'

/**
 * Classe base abstrata para repositories
 * 
 * @template T - Tipo da entidade
 */
export abstract class BaseRepository<T> {
  /**
   * @param tableName - Nome da tabela no banco de dados
   */
  constructor(protected readonly tableName: string) {}

  /**
   * Busca todos os registros
   * 
   * @returns Lista de registros ordenados por data de criação (mais recentes primeiro)
   */
  async findAll(): Promise<T[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        logger.error(`Erro ao buscar todos os registros de ${this.tableName}`, error)
        throw error
      }

      return ((data || []) as any[]).map(convertToCamelCase) as T[]
    } catch (error) {
      logger.error(`Erro em findAll de ${this.tableName}`, error)
      throw error
    }
  }

  /**
   * Busca um registro por ID
   * 
   * @param id - ID do registro
   * @returns Registro encontrado ou null se não existir
   */
  async findById(id: string): Promise<T | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        // Código PGRST116 = registro não encontrado
        if (error.code === 'PGRST116') {
          return null
        }
        logger.error(`Erro ao buscar registro ${id} de ${this.tableName}`, error)
        throw error
      }

      return convertToCamelCase(data) as T
    } catch (error) {
      logger.error(`Erro em findById de ${this.tableName}`, error, { id })
      throw error
    }
  }

  /**
   * Cria um novo registro
   * 
   * @param payload - Dados do registro (campos opcionais)
   * @returns Registro criado
   */
  async create(payload: Partial<T>): Promise<T> {
    try {
      const snakePayload = convertToSnakeCase(payload)
      
      logger.debug(`Criando registro em ${this.tableName}`, { payload: snakePayload })
      
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(snakePayload)
        .select()
        .single()

      if (error) {
        logger.error(`Erro ao criar registro em ${this.tableName}`, error, { payload })
        throw error
      }

      const result = convertToCamelCase(data) as T
      logger.debug(`Registro criado em ${this.tableName}`, { id: (result as any).id })
      
      return result
    } catch (error) {
      logger.error(`Erro em create de ${this.tableName}`, error, { payload })
      throw error
    }
  }

  /**
   * Atualiza um registro existente
   * 
   * @param id - ID do registro
   * @param payload - Dados parciais para atualizar
   * @returns Registro atualizado
   */
  async update(id: string, payload: Partial<T>): Promise<T> {
    try {
      const snakePayload = convertToSnakeCase(payload)
      
      logger.debug(`Atualizando registro ${id} em ${this.tableName}`, { 
        payload: snakePayload 
      })
      
      const { data, error } = await supabase
        .from(this.tableName)
        .update(snakePayload)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        logger.error(`Erro ao atualizar registro ${id} em ${this.tableName}`, error, { payload })
        throw error
      }
      
      const result = convertToCamelCase(data) as T
      logger.debug(`Registro atualizado em ${this.tableName}`, { id })
      
      return result
    } catch (error) {
      logger.error(`Erro em update de ${this.tableName}`, error, { id, payload })
      throw error
    }
  }

  /**
   * Deleta um registro
   * 
   * @param id - ID do registro
   */
  async delete(id: string): Promise<void> {
    try {
      logger.debug(`Deletando registro ${id} de ${this.tableName}`)
      
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)

      if (error) {
        logger.error(`Erro ao deletar registro ${id} de ${this.tableName}`, error)
        throw error
      }

      logger.debug(`Registro deletado de ${this.tableName}`, { id })
    } catch (error) {
      logger.error(`Erro em delete de ${this.tableName}`, error, { id })
      throw error
    }
  }
}
