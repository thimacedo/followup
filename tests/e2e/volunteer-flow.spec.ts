import { test, expect } from '@playwright/test';

test.describe('CCVideira Follow-up Flow', () => {
  test('Fluxo completo: Login de Admin, Cadastro de Visitante e Relatórios', async ({ page }) => {
    // 1. Acesso inicial e verificação da página de Login
    await page.goto('/');
    await expect(page.locator('text=Acesso ao Sistema')).toBeVisible();

    // 2. Solicitação de Código com o email do Admin
    await page.fill('input[type="email"]', 'admin@ccvideira.com.br');
    
    // Checkbox Lembrar-me fica na primeira tela
    await page.click('text=Manter conectado neste computador');
    
    page.on('response', async response => {
      if (response.url().includes('/api/auth/')) {
        console.log(`[Network] ${response.url()}: ${response.status()}`);
        console.log(await response.text());
      }
    });

    await page.click('text=Solicitar código');

    // Aguarda a interface do código aparecer (e o devCode se tornar visível)
    await expect(page.locator('text=Código de acesso')).toBeVisible({ timeout: 10000 });

    // 3. Pegar o devCode da interface
    const devCodeElement = page.locator('[data-testid="dev-code"]');
    await expect(devCodeElement).toBeVisible({ timeout: 10000 });
    const devCodeText = await devCodeElement.textContent();
    // Extrai os 6 dígitos. Exemplo: "[Dev] Código: 123456"
    const match = devCodeText?.match(/\d{6}/);
    expect(match).not.toBeNull();
    const code = match![0];

    // 4. Preencher o código usando os inputs
    await page.locator('text=' + code[0]).locator('..').first().click({ force: true }).catch(() => page.locator('input').first().click({ force: true }));
    await page.keyboard.type(code);
    await page.waitForTimeout(500);
    
    // Entrar
    await page.click('button:has-text("Entrar")');
    
    // Verifica se logou (deve ver o menu principal)
    await expect(page.locator('text=CCVideira')).toBeVisible();
    
    // 5. Cadastro de Visitante no Lounge (Aba Cadastro)
    await page.click('text=Lounge'); // Navega para a aba de Lounge/Cadastro
    
    await expect(page.locator('text=Cadastro de Visitante').first()).toBeVisible();
    await page.fill('input[placeholder="Nome do visitante"]', 'Visitante Teste Playwright');
    await page.fill('input[placeholder="(84) 99999-9999"]', '84999999999');
    
    // Preenche o Ministério de Destino
    await page.click('button[role="combobox"]:has-text("Selecione o ministério")');
    // Clica na primeira opção da lista
    await page.locator('div[role="option"]').first().click();

    // Seleciona gênero (opcional)
    await page.click('button[role="combobox"]:has-text("Selecione")'); 
    await page.click('div[role="option"]:has-text("Masculino")');
    
    // Cadastrar
    await page.click('button:has-text("Cadastrar visitante")');
    await expect(page.locator('text=Visitante cadastrado')).toBeVisible({ timeout: 10000 });
    
    // 6. Verificar os Cards no Dashboard
    await page.click('text=Dashboard'); // Volta para a aba Dashboard
    await page.reload(); // Garante o carregamento dos cards mais recentes
    
    await expect(page.locator('text=Visitante Teste Playwright').first()).toBeVisible({ timeout: 15000 });

    // 7. Acessar Módulo de Relatórios
    await page.click('text=Relatórios');
    await expect(page.locator('text=Relatórios Gerenciais')).toBeVisible();
    
    // Clica em Carregar Dados
    await page.click('button:has-text("Carregar Dados")');
    
    // Verifica se o card do visitante apareceu na tabela
    await expect(page.locator('table >> text=Visitante Teste Playwright').first()).toBeVisible();
    
    // Verifica botão Exportar PDF
    await expect(page.locator('button:has-text("Exportar PDF")')).toBeEnabled();
  });
});
