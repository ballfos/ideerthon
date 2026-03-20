import { test, expect } from '@playwright/test';

test('あいでぃあ村：トーク作成フローのデモ', async ({ page, context }) => {
  // 1. ページ読み込み前に認証をバイパスする設定を注入する
  await context.addInitScript(() => {
    localStorage.setItem('e2e-auth-bypass', 'true');
  });

  // 2. ページを開く
  await page.goto('http://localhost:3000');

  // 3. ホーム画面が表示されるのを待つ
  await expect(page.locator('h1')).toContainText(/あいでぃあ村/i);
  await page.waitForTimeout(1000); // ユーザーに見せるためのウェイト

  // 4. トーク作成画面へ遷移
  const newTalkButton = page.getByRole('link', { name: /新しくトークを始める/i });
  if (await newTalkButton.isVisible()) {
    await newTalkButton.click();
  } else {
    await page.goto('http://localhost:3000/talks/new');
  }

  // 5. テーマの入力
  // 「新しいトークを始める」という見出しが表示されるのを待つ
  await expect(page.getByText('新しいトークを始める', { exact: false })).toBeVisible();
  
  const themeInput = page.getByPlaceholder(/例\) 新しいキャンプ用品/i);
  await themeInput.fill('宇宙旅行の新しいお土産');
  await page.waitForTimeout(1000);

  // 6. メンバーの確認
  await expect(page.getByText('若手エンジニア')).toBeVisible();
  await expect(page.getByText('女子高生')).toBeVisible();
  
  // 7. 送信ボタンの状態確認（活性化しているはず）
  const submitBtn = page.getByRole('button', { name: /村へ向かう!!/i });
  await expect(submitBtn).toBeEnabled();

  // 8. 少し停止（ユーザーが確認できるように）
  await page.waitForTimeout(2000);
  
  console.log('✅ デモンストレーションが完了しました。');
});
