import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

@pytest.fixture
def driver():
    options = webdriver.ChromeOptions()
    # Opcional: adicionar --headless se não quiser ver o browser abrir
    driver = webdriver.Chrome(options=options)
    driver.get("http://localhost:3000")
    yield driver
    driver.quit()

def test_trocar_lingua_para_frances(driver):
    wait = WebDriverWait(driver, 15)

    # 1. Abrir o menu de idiomas
    trigger = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='lang-selector-trigger']")))
    trigger.click()

    # 2. Clicar em Francês
    fr_option = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='lang-option-fr']")))
    fr_option.click()

    # 3. Validar a tradução
    titulo = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "[data-testid='login-title']")))
    
    assert "Bienvenue" in titulo.text, f"Esperado 'Bienvenue', mas encontrei: {titulo.text}"