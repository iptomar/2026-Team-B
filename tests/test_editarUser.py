import time
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestEditarUser(unittest.TestCase):
    def setUp(self):
        # Inicializa o WebDriver (estamos a assumir Chrome por padrão)
        self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(10)
        # Atualizar este URL para um URL mais apropriado
        #self.base_url = "https://bgp.azurewebsites.net/" 
        self.base_url = "http://localhost:3000" 

    def test_editar_user(self):
        driver = self.driver
        # Navega para a página de Login
        driver.get(f"{self.base_url}/") 

        # Procura os campos de username e password através do ID
        username_input = WebDriverWait(driver, 1).until(
            EC.presence_of_element_located((By.ID, "username"))
        )
        password_input = driver.find_element(By.ID, "password")

        # Preenche as credenciais com "test" e "test"
        username_input.send_keys("test")
        password_input.send_keys("test")

        # Clica no botão de submeter
        submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_button.click()

        # Procura a card de "Manage Users" e clica nela
        manageUsers_actionCard = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "manage-users-card"))
        )        
        manageUsers_actionCard.click()

        # Aguarda até que o URL da página mude e contenha "/manage-users"
        WebDriverWait(driver, 10).until(
            EC.url_contains("/manage-users")
        )

        time.sleep(5)

        # Verifica se o redirecionamento foi bem sucedido
        self.assertIn("/manage-users", driver.current_url, "O redirecionamento para a página de gestão falhou.")

        # Encontra a linha com o email "string@ipt.pt" e clica no botão "Edit" correspondente
        edit_button_xpath = "//tr[td[text()='string@ipt.pt']]//button[contains(@class, 'btn-edit')]"
        edit_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, edit_button_xpath))
        )
        edit_button.click()

        # Aguarda que o modal abra, encontra a option pretendida e clica para selecionar
        doctor_option_xpath = "//select[@name='roles']//option[@value='69dc150d3c511be8a3a05eec']"
        doctor_option = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, doctor_option_xpath))
        )
        doctor_option.click()

        # Altera o username para "string1"
        username_field = driver.find_element(By.NAME, "username")
        username_field.clear()
        username_field.send_keys("string1")

        # Altera o email para "string1@ipt.pt"
        email_field = driver.find_element(By.NAME, "email")
        email_field.clear()
        email_field.send_keys("string1@ipt.pt")

        # Encontra o botão Save no modal e clica
        save_button_xpath = "//button[@type='submit' and contains(@class, 'btn-primary') and text()='Save']"
        save_button = driver.find_element(By.XPATH, save_button_xpath)
        save_button.click()

        print("\n--- SUCESSO: Utilizador editado e guardado com sucesso! ---")

        # Pausa de 5 segundos para visualização do resultado
        time.sleep(5)
    
    def tearDown(self):
        # Fecha o browser após o teste
        self.driver.quit()

if __name__ == "__main__":
    unittest.main()
