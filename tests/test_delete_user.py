import time
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select

class TestDeleteUser(unittest.TestCase):
    def setUp(self):
        # Inicializa o WebDriver
        self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(10)
        self.base_url = "http://localhost:5000"

    def test_delete_user_flow(self):
        driver = self.driver
        
        # 1. Navegar para a página inicial (Login)
        driver.get(f"{self.base_url}/") 

        # 2. Preencher credenciais de Login (Admin)
        username_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "username"))
        )
        password_input = driver.find_element(By.ID, "password")
        
        username_input.send_keys("test")
        password_input.send_keys("p")

        submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_button.click()

        WebDriverWait(driver, 10).until(
            EC.url_contains("/dashboard")
        )

        # 3. Clicar no botão de Gestão de Utilizadores na Dashboard
        manageUsers_actionCard = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "manage-users-card"))
        )        
        manageUsers_actionCard.click()

        WebDriverWait(driver, 10).until(
            EC.url_contains("/manage-users")
        )

        # 4. Clicar no botão "+ Add User"
        add_user_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), '+ Add User')]"))
        )
        add_user_btn.click()

        new_username_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "username"))
        )
        
        # 5. Preencher os dados do novo utilizador teste
        email_input = driver.find_element(By.NAME, "email")
        password_input_modal = driver.find_element(By.NAME, "password")
        
        unique_id = int(time.time())
        test_username = f"del_user_{unique_id}"
        test_email = f"delete_{unique_id}@ipt.pt"
        
        new_username_input.send_keys(test_username)
        email_input.send_keys(test_email)
        password_input_modal.send_keys("Pass123!")

        roles_select_element = driver.find_element(By.NAME, "roles")
        roles_select = Select(roles_select_element)
        
        WebDriverWait(driver, 10).until(
            lambda d: len(roles_select.options) > 0
        )
        roles_select.select_by_index(0)

        # Clicar em Save
        save_btn = driver.find_element(By.XPATH, "//button[@type='submit' and contains(@class, 'btn-primary')]")
        save_btn.click()

        # 6. Esperar que o utilizador apareça na listagem
        user_card_xpath = f"//div[contains(@class, 'user-card') and .//span[contains(@class, 'user-card-name') and text()='{test_username}']]"
        
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, user_card_xpath))
        )
        print(f"\n--- SUCESSO: Utilizador '{test_username}' criado para o teste. ---")

        # 7. Clicar no botão de apagar correspondente a esse utilizador
        delete_btn_xpath = f"{user_card_xpath}//button[contains(@class, 'btn-delete')]"
        delete_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, delete_btn_xpath))
        )
        delete_btn.click()

        # 8. Confirmar o alert nativo do browser de eliminação
        alert = WebDriverWait(driver, 10).until(EC.alert_is_present())
        alert.accept()

        # 9. Garantir que o utilizador desaparece da página
        WebDriverWait(driver, 10).until(
            EC.invisibility_of_element_located((By.XPATH, user_card_xpath))
        )
        print(f"--- SUCESSO: Utilizador '{test_username}' foi apagado do sistema! ---")

    def tearDown(self):
        # Fecha o browser após o teste
        self.driver.quit()

if __name__ == "__main__":
    unittest.main()
