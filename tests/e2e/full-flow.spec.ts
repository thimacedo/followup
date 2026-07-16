import { test, expect, Page } from '@playwright/test';

// Use admin credentials from seed
const ADMIN_EMAIL = 'thi.macedo@gmail.com';
const runId = Date.now();
const LOUNGE_EMAIL = `lounge.test.${runId}@gmail.com`;
const VOLUNTEER_EMAIL = `volunteer.test.${runId}@gmail.com`;
const VISITOR_NAME = 'Visitante E2E Test ' + runId;
const runIdShort = String(runId).slice(-8); // 8 digits
const LOUNGE_PHONE = `849${runIdShort}`;
const VOLUNTEER_PHONE = `848${runIdShort}`;
const VISITOR_PHONE = `847${runIdShort}`;

// Helper para fazer login
async function loginAs(page: Page, email: string) {
  await page.goto('/');
  
  // Fill email
  await page.fill('input[type="email"]', email);
  await page.click('button:has-text("Solicitar código")');

  // Wait for Dev Code to appear on screen
  await page.waitForSelector('[data-testid="dev-code"]', { timeout: 15000 });
  const devCodeText = await page.textContent('[data-testid="dev-code"]');
  const match = devCodeText?.match(/\[Dev\] Código: (\d{6})/);
  if (!match) throw new Error('Código dev não encontrado na tela');
  const code = match[1];

  // O input invisível do InputOTP geralmente tem autocomplete="one-time-code"
  await page.waitForSelector('input[autocomplete="one-time-code"]', { timeout: 10000 });
  await page.locator('input[autocomplete="one-time-code"]').focus();
  await page.keyboard.type(code, { delay: 50 });
  
  // Wait for the verification API call to succeed
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/auth/verify') && resp.status() === 200),
    page.click('button:has-text("Entrar")')
  ]);
  
  // Wait a bit for the UI to transition and the AppStore to populate
  await page.waitForTimeout(1500);
}

// Helper para fazer logout
async function logout(page: Page) {
  // Clear cookies to simulate logout
  await page.context().clearCookies();
  await page.goto('/');
  await expect(page.locator('input[type="email"]')).toBeVisible();
}

test.describe('E2E Full Follow-up Flow', () => {
  // Test sequence:
  // 1. Admin logs in and creates Lounge and Volunteer users
  // 2. Lounge logs in and creates a Visitor
  // 3. Admin logs in, sees the Card and assigns Volunteer
  // 4. Volunteer logs in, adds a Note and changes status

  test('Deve realizar o processo completo com Admin, Lounge e Voluntário', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    // --- STEP 1: ADMIN CREATES USERS ---
    console.log('1. Admin logando para criar usuários...');
    await loginAs(page, ADMIN_EMAIL);
    
    // Go to "Equipe"
    await page.click('button:has-text("Equipe")');
    await page.waitForSelector('text=Equipe de Follow-up');

    // Create Lounge User
    await page.click('button:has-text("Novo")');
    await page.fill('input[placeholder="Nome completo"]', 'Test Lounge');
    await page.fill('input[placeholder="seu@email.com"]', LOUNGE_EMAIL);
    await page.fill('input[placeholder="(84) 99999-9999"]', LOUNGE_PHONE);
    await page.click('button[role="combobox"]'); // Select Role
    await page.click('div[role="option"]:has-text("Lounge")');
    await page.click('button:has-text("Salvar")');
    await page.waitForTimeout(2000); // Wait for toast and refresh

    // Create Volunteer User
    await page.click('button:has-text("Novo")');
    await page.fill('input[placeholder="Nome completo"]', 'Test Volunteer');
    await page.fill('input[placeholder="seu@email.com"]', VOLUNTEER_EMAIL);
    await page.fill('input[placeholder="(84) 99999-9999"]', VOLUNTEER_PHONE);
    // The role select is the first combobox in the dialog
    await page.locator('button[role="combobox"]').first().click();
    await page.click('div[role="option"]:has-text("Voluntário")');
    
    // Assign department 'A13 Uni' so this volunteer can receive the visitor later
    await page.locator('label:has-text("A13 Uni") input[type="checkbox"]').check();
    
    await page.click('button:has-text("Salvar")');
    await page.waitForTimeout(2000);
    
    await logout(page);

    // --- STEP 2: LOUNGE REGISTERS VISITOR ---
    console.log('2. Lounge logando para cadastrar visitante...');
    await loginAs(page, LOUNGE_EMAIL);
    
    // Navigate to Cadastrar Visitante tab
    await page.click('button:has-text("Cadastrar Visitante")');
    
    // Fill the form
    await page.fill('input#name', VISITOR_NAME);
    await page.fill('input#phone', VISITOR_PHONE);
    
    // Select department
    await page.click('button:has-text("Selecione o ministério")');
    await page.click('div[role="option"]:has-text("A13 Uni")');
    
    // Select Gender
    await page.click('button:has-text("Selecione")'); // First 'Selecione' is gender
    await page.click('div[role="option"]:has-text("Masculino")');
    
    // Select Marital Status
    await page.click('button:has-text("Selecione")'); // Now 'Selecione' should match marital status since gender has a value
    await page.click('div[role="option"]:has-text("Solteiro(a)")');
    
    // Click submit
    await page.click('button#submit-visitor');
    
    // Expect success
    await expect(page.locator('text=Visitante cadastrado!')).toBeVisible({ timeout: 15000 });
    await logout(page);

    // --- STEP 3: ADMIN ASSIGNS VOLUNTEER ---
    console.log('3. Admin logando para atribuir o card...');
    await loginAs(page, ADMIN_EMAIL);
    
    // Na dashboard (Kanban), procurar o visitante
    await page.click('button:has-text("Dashboard")');
    await page.waitForSelector(`text=${VISITOR_NAME}`);
    
    // Clicar no card do visitante para abrir o modal (Sheet)
    await page.locator(`text=${VISITOR_NAME}`).first().click();
    await page.waitForSelector('text=Dados do Visitante');

    // Selecionar o Voluntário
    // O texto do trigger do Select será o placeholder ou a opção nula
    await page.click('text="— Sem voluntário —"');
    
    // Select the newly created volunteer
    await page.click('div[role="option"]:has-text("Test Volunteer")');
    
    // Click save button next to the select
    await page.click('button#assign-volunteer-btn');
    
    await page.waitForTimeout(2000); // Wait for assignment
    
    // Close Sheet
    await page.keyboard.press('Escape');
    await logout(page);

    // --- STEP 4: VOLUNTEER ADDS NOTE & STATUS ---
    console.log('4. Voluntário trabalhando no card...');
    await loginAs(page, VOLUNTEER_EMAIL);
    
    await page.click('button:has-text("Meus Cards")'); // Or dashboard
    await page.waitForSelector(`text=${VISITOR_NAME}`);
    await page.locator(`text=${VISITOR_NAME}`).first().click();
    
    await page.waitForSelector('text=Dados do Visitante');
    
    // Mudar Status para "Em Contato"
    await page.locator('button:has-text("Novo")').click(); // Current status
    await page.click('div[role="option"]:has-text("Em Contato")');

    // Adicionar Nota
    await page.fill('textarea[placeholder*="Ex: Visitante respondeu"]', 'Ligação efetuada. Muito receptivo ao convite da próxima célula.');
    await page.click('button:has-text("Adicionar nota")');

    // Wait for the note to appear in the History
    await expect(page.locator('text=Ligação efetuada. Muito receptivo ao convite da próxima célula.')).toBeVisible();

    console.log('Teste E2E finalizado com sucesso!');
  });
});
