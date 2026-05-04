import time
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestLogin(unittest.TestCase):
    def setUp(self):
        # Inicializa o WebDriver (estamos a assumir Chrome por padrão)
        self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(10)
        # Atualizar este URL para um URL mais apropriado
        self.base_url = "https://bgp.azurewebsites.net/" 

    def test_login_success_and_redirect(self):
        driver = self.driver
        # Navega para a página de Login (assumindo que seja a rota '/' ou '/login')
        driver.get(f"{self.base_url}/") 

        # Procura os campos de username e password através do ID
        username_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "username"))
        )
        password_input = driver.find_element(By.ID, "password")

        # Preenche as credenciais com "test" e "test"
        username_input.send_keys("test")
        password_input.send_keys("test")

        # Clica no botão de submeter
        submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_button.click()

        # Aguarda até que o URL da página mude e contenha "/dashboard"
        WebDriverWait(driver, 10).until(
            EC.url_contains("/dashboard")
        )

        # Verifica se o redirecionamento foi bem sucedido
        self.assertIn("/dashboard", driver.current_url, "O redirecionamento para a dashboard falhou.")
        print("\n--- SUCESSO: Login efetuado e redirecionamento para a dashboard confirmado! ---")

    def tearDown(self):
        # Fecha o browser após o teste
        self.driver.quit()

if __name__ == "__main__":
    unittest.main()
