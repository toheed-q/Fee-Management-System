const { Builder, By, Key } = require('selenium-webdriver');
const fs = require('fs');

async function runTest() {
  let driver = await new Builder().forBrowser('chrome').build();

  try {
    // Open your local site login page (adjust URL if needed)
    await driver.get('http://127.0.0.1:5501/'); 
    await driver.sleep(2000);

    // Fill the email and password fields using their IDs
    await driver.findElement(By.id('login-email')).sendKeys('admin@school.com');
    await driver.findElement(By.id('login-password')).sendKeys('admin123');

    // Submit the form by sending ENTER key on password field or clicking submit button
    // Option 1: Press Enter on password input
    await driver.findElement(By.id('login-password')).sendKeys(Key.RETURN);

    // Option 2: Alternatively, click the submit button (uncomment to use)
    // await driver.findElement(By.css('#login-form button[type="submit"]')).click();

    await driver.sleep(3000);

    // Take a screenshot after login
    let screenshot = await driver.takeScreenshot();
    fs.writeFileSync('login_screen.png', screenshot, 'base64');
    console.log('✅ Screenshot saved as login_screen.png');

    // Save page HTML after login
    let pageSource = await driver.getPageSource();
    fs.writeFileSync('after_login.html', pageSource, 'utf-8');
    console.log('✅ HTML saved as after_login.html');

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await driver.quit();
  }
}

runTest();
