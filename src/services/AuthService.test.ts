import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from './AuthService'
import { db } from '@/lib/db'

vi.mock('@/lib/db', () => {
  return {
    db: {
      user: {
        findFirst: vi.fn(),
      },
      accessCode: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    },
  }
})

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve disparar erro se email nao for fornecido', async () => {
    await expect(AuthService.requestAccessCode('')).rejects.toThrow('E-mail é obrigatório')
  })

  it('deve disparar erro se usuario nao for encontrado', async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue(null)
    await expect(AuthService.requestAccessCode('teste@teste.com')).rejects.toThrow('E-mail não cadastrado')
  })

  it('deve bloquear (throttling) se um codigo ja foi gerado nos ultimos 15 minutos', async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue({
      id: 'user1',
      name: 'João da Silva',
      email: 'joao@teste.com',
      active: true,
    } as any)

    // Simula que existe um código recente
    vi.mocked(db.accessCode.findFirst).mockResolvedValue({
      id: 'code1',
      code: '123456',
      createdAt: new Date(),
    } as any)

    const result = await AuthService.requestAccessCode('joao@teste.com')
    
    expect(result.throttled).toBe(true)
    expect(result.message).toContain('Um código já foi enviado recentemente')
    expect(db.accessCode.create).not.toHaveBeenCalled()
  })

  it('deve gerar novo codigo se nenhum foi gerado recentemente', async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue({
      id: 'user1',
      name: 'João da Silva',
      email: 'joao@teste.com',
      active: true,
    } as any)

    // Nenhum código recente
    vi.mocked(db.accessCode.findFirst).mockResolvedValue(null)
    vi.mocked(db.accessCode.create).mockResolvedValue({} as any)

    const result = await AuthService.requestAccessCode('joao@teste.com')
    
    expect(result.throttled).toBe(false)
    expect(result.message).toContain('Código gerado')
    expect(db.accessCode.create).toHaveBeenCalled()
  })
})
