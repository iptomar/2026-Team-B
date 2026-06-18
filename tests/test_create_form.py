import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

@pytest.fixture
def driver():
    # Inicializa o Chrome
    driver = webdriver.Chrome()
    driver.maximize_window()
    yield driver
    driver.quit()

def test_template_builder_flow(driver):
    wait = WebDriverWait(driver, 10)
    actions = ActionChains(driver)

    # 1. Abrir a página inicial (Login)
    driver.get("http://localhost:3000")

    # 2. Efetuar Login com "test" / "test"
    # Procura os campos de input pelo ID (conforme o padrão comum do Selenium)
    username_field = wait.until(EC.presence_of_element_located((By.ID, "username")))
    password_field = driver.find_element(By.ID, "password")
    
    username_field.send_keys("test")
    password_field.send_keys("test")
    
    # Clica no botão de submeter o login
    login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
    login_button.click()

    # 3. Navegar para o Template Builder
    # Após o login, espera que o URL mude ou que o botão do builder apareça
    builder_btn = wait.until(EC.element_to_be_clickable(
        (By.XPATH, "//*[contains(text(), 'Template Builder')]")
    ))
    builder_btn.click()

    # 4. Adicionar um campo texto (Drag & Drop)
    # Localiza o "Text Input" na paleta esquerda
    text_input_item = wait.until(EC.presence_of_element_located(
        (By.XPATH, "//div[contains(@class, 'fb-palette-item') and contains(., 'Text Input')]")
    ))
    
    # Localiza o slot de destino (primeira coluna vazia)
    target_slot = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "fb-slot-empty")))

    # Executa a ação de arrastar e soltar
    actions.drag_and_drop(text_input_item, target_slot).perform()

    # 5. Clicar em "CREATE TEMPLATE"
    save_btn = wait.until(EC.element_to_be_clickable(
        (By.XPATH, "//button[contains(text(), 'CREATE TEMPLATE')]")
    ))
    save_btn.click()

    # 6. Confirmar na Modal
    confirm_btn = wait.until(EC.element_to_be_clickable(
        (By.XPATH, "//div[contains(@class, 'fb-modal')]//button[contains(text(), 'CONFIRM')]")
    ))
    confirm_btn.click()

    # 7. Validar mensagem de sucesso (Toast)
    success_toast = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "fb-toast-ok")))
    
    assert "success" in success_toast.text.lower() or "saved" in success_toast.text.lower()
    print("\n--- SUCESSO: Login efetuado, elemento arrastado e template guardado! ---")