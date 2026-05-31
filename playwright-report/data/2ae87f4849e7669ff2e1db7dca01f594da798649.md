# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: extension.spec.ts >> VaultGuard Gold Release E2E Suite >> Vault creation, locking, and unlocking
- Location: e2e/extension.spec.ts:10:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Unlock Vault')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Unlock Vault')

```

```yaml
- heading "VaultGuard" [level=1]
- paragraph: Cybersecurity Vault
- text: Vault Secured
- heading "Unlock Database" [level=2]
- textbox "Master Password"
- button
- button "Unlock Database" [disabled]
- text: Biometric Unlock (TouchID ready)
- paragraph: 🛡️ Local AES-256-GCM • Zero-Knowledge Architecture
```

# Test source

```ts
  1  | import { expect, test } from './fixtures/extension'
  2  | 
  3  | test.describe('VaultGuard Gold Release E2E Suite', () => {
  4  |   let vaultUrl: string
  5  | 
  6  |   test.beforeEach(async ({ extensionId }) => {
  7  |     vaultUrl = `chrome-extension://${extensionId}/index.html`
  8  |   })
  9  | 
  10 |   test('Vault creation, locking, and unlocking', async ({ page }) => {
  11 |     await page.goto(vaultUrl)
  12 |     
  13 |     // Setup vault
  14 |     await page.fill('input[placeholder="Master password"]', 'MasterPassword123!')
  15 |     await page.fill('input[placeholder="Confirm password"]', 'MasterPassword123!')
  16 |     await page.click('button:has-text("Create Vault")')
  17 |     
  18 |     // Should navigate to dashboard (verify items exist)
  19 |     await expect(page.locator('text=All Items')).toBeVisible()
  20 | 
  21 |     // Lock vault (we can click a lock button if it exists, or dispatch a message)
  22 |     // There is a Lock Vault button in the UI (sidebar or header)
  23 |     await page.click('text=Lock Vault')
> 24 |     await expect(page.locator('text=Unlock Vault')).toBeVisible()
     |                                                     ^ Error: expect(locator).toBeVisible() failed
  25 | 
  26 |     // Unlock vault
  27 |     await page.fill('input[type="password"]', 'MasterPassword123!')
  28 |     await page.click('button:has-text("Unlock")')
  29 |     await expect(page.locator('text=All Items')).toBeVisible()
  30 |   })
  31 | 
  32 |   test('Add, search, and delete item', async ({ page }) => {
  33 |     await page.goto(vaultUrl)
  34 |     
  35 |     // Setup vault
  36 |     await page.fill('input[placeholder="Master password"]', 'MasterPassword123!')
  37 |     await page.fill('input[placeholder="Confirm password"]', 'MasterPassword123!')
  38 |     await page.click('button:has-text("Create Vault")')
  39 |     
  40 |     // Go to items
  41 |     await page.click('text=All Items')
  42 |     
  43 |     // Add item
  44 |     await page.click('button:has-text("Add Item")')
  45 |     await page.fill('input[name="name"]', 'GitHub E2E')
  46 |     await page.fill('input[name="username"]', 'e2e@github.com')
  47 |     await page.fill('input[name="rawPassword"]', 'testpass123')
  48 |     await page.fill('input[name="website"]', 'github.com')
  49 |     await page.click('button:has-text("Save")')
  50 | 
  51 |     // Search item
  52 |     await page.fill('input[placeholder*="Search"]', 'GitHub')
  53 |     await expect(page.locator('text=GitHub E2E')).toBeVisible()
  54 | 
  55 |     // Delete item
  56 |     await page.click('text=GitHub E2E')
  57 |     await page.click('button:has-text("Delete")')
  58 |     await expect(page.locator('text=GitHub E2E')).not.toBeVisible()
  59 |   })
  60 | 
  61 |   test('Autofill injection on React login', async ({ page }) => {
  62 |     // Navigate to React fixture
  63 |     await page.goto('http://localhost:3000/react-login')
  64 |     
  65 |     // The content script should inject the autofill icon into the input fields
  66 |     const usernameInput = page.locator('#username')
  67 |     await expect(usernameInput).toBeVisible()
  68 |     
  69 |     // We expect the vaultguard-icon to be injected into the wrapper
  70 |     // We'll verify it doesn't crash and the elements exist
  71 |     await expect(page.locator('form#react-login')).toBeVisible()
  72 |   })
  73 | 
  74 |   test('Security: Hidden field attack mitigation', async ({ page }) => {
  75 |     await page.goto('http://localhost:3000/hidden-attack')
  76 |     
  77 |     // Ensure hidden fields are not interacted with or filled automatically
  78 |     const hiddenUsername = page.locator('input[name="username"]')
  79 |     await expect(hiddenUsername).toBeHidden()
  80 |   })
  81 | })
  82 | 
```