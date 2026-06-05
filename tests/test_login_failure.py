import time
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestLoginFailure(unittest.TestCase):
    def setUp(self):
        # Inicializa o WebDriver 
        self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(10)
        self.base_url = "http://localhost:3000" 

    def test_login_failure(self):
        driver = self.driver
        # Navega para a página de Login
        driver.get(f"{self.base_url}/") 

        # Procura os campos de username e password através do ID
        username_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "username"))
        )
        password_input = driver.find_element(By.ID, "password")

        # Preenche as credenciais com dados inválidos
        username_input.send_keys("utilizador_invalido")
        password_input.send_keys("password_errada")

        # Clica no botão de submeter
        submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_button.click()

        # Aguarda um pouco para dar tempo a um possível redirecionamento ou erro
        time.sleep(3)

        # Verifica se o redirecionamento NÃO ocorreu
        self.assertNotIn("/dashboard", driver.current_url, "O login falhou, mas redirecionou indevidamente para a dashboard.")
        print("\n--- SUCESSO: Tentativa de login inválida foi bloqueada conforme esperado! ---")

    def tearDown(self):
        # Fecha o browser após o teste
        self.driver.quit()

if __name__ == "__main__":
    unittest.main()
