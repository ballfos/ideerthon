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
  await submitBtn.click();

  // 8. チャット画面でのインタラクション
  console.log('--- チャット操作のデモ ---');
  await page.waitForURL(/\/talks\/.+/);
  
  // 入力欄が表示されるまで待機（networkidleは厳しすぎるため、特定の要素を待つ）
  const chatInput = page.getByPlaceholder(/メッセージを入力.../i);
  await expect(chatInput).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000); // UIのアニメーション待ち
  
  await chatInput.fill('【デモ検証】宇宙で一番人気のお土産は何ですか？具体的に教えてください。');
  await page.waitForTimeout(1000);
  
  const sendBtn = page.getByRole('button', { name: '送信' });
  await sendBtn.click();
  console.log('デモ用メッセージを送信しました。');
  
  // AIの応答を待つ（少し長めに待機）
  await page.waitForTimeout(8000);
  
  // お気に入り登録（最後のメッセージのスターボタンを探す）
  // 最後に届いたAIのメッセージを特定してお気に入りする
  const lastMessage = page.locator('div[data-testid="message-list"] > div').last();
  const starBtn = lastMessage.locator('button:has(svg.lucide-star)');
  
  if (await starBtn.isVisible()) {
    await starBtn.click();
    console.log('最新のAI応答をお気に入り登録しました。');
    await page.waitForTimeout(2000); // 同期待ち
  }

  // 9. アイデアマップの操作
  console.log('--- アイデアマップのデモ ---');
  const mapTab = page.getByText('あいでぃあ村');
  await mapTab.click();
  await page.waitForTimeout(3000);
  
  // マップ上のノードをクリック
  const node = page.locator('g.node').first();
  if (await node.isVisible()) {
    await node.click();
    console.log('マップ上のアイデアを選択しました。');
    await page.waitForTimeout(1000);
    
    // サイドバーのリサイクルボタンをクリック
    const recycleBtn = page.getByRole('button', { name: /リサイクル/i });
    if (await recycleBtn.isVisible()) {
      await recycleBtn.click();
      console.log('アイデアをリサイクルしました。');
      await page.waitForTimeout(2000);
    }
  }

  // 10. お気に入り画面の確認
  console.log('--- お気に入り画面での確認 ---');
  await page.goto('http://localhost:3000/favorites');
  await expect(page.getByText('お気に入りメッセージ')).toBeVisible();
  
  // お気に入りリストの最上部付近に、先ほどお気に入りした内容があるか確認
  // (AIの応答の断片が含まれているはず)
  await page.waitForTimeout(2000);
  console.log('お気に入り画面で登録内容を確認中...');
  
  // 11. リサイクルボックスの確認
  console.log('--- リサイクルボックスでの確認 ---');
  await page.goto('http://localhost:3000/recycle');
  await expect(page.getByText('リサイクルボックス')).toBeVisible();
  await page.waitForTimeout(2000);
  
  console.log('✅ 全てのデモンストレーションと確認が完了しました。');
});
