import time
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select

class TestCreateUser(unittest.TestCase):
    def setUp(self):
        # Utilizado o Firefox em vez do Chrome/Chromium
        # por problema encontrado no linux que não 
        # funciona corretamente se a aplicação for instalada por flatpak/snap
        from selenium.webdriver.firefox.options import Options
        options = Options()
        # options.add_argument('--headless') # Descomente se quiser correr em background
        
        self.driver = webdriver.Firefox(options=options)
        self.driver.implicitly_wait(10)
        self.base_url = "http://localhost:3000"

    def test_create_user_flow(self):
        driver = self.driver
        
        # 1. Navegar para a página inicial (Login)
        driver.get(f"{self.base_url}") 

        # 2. Preencher credenciais de Login (Admin)
        username_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "username"))
        )
        password_input = driver.find_element(By.ID, "password")
        
        username_input.send_keys("test")
        password_input.send_keys("test")

        # Clicar no botão de submeter
        submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_button.click()

        # Aguarda redirecionamento para a dashboard
        WebDriverWait(driver, 10).until(
            EC.url_contains("/dashboard")
        )
        print("Login efetuado com sucesso.")

        # 3. Clicar no botão de Gestão de Utilizadores na Dashboard
        user_management_link = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//a[@href='/manage-users']"))
        )
        user_management_link.click()

        # Aguarda a página de gestão de utilizadores carregar
        WebDriverWait(driver, 10).until(
            EC.url_contains("/manage-users")
        )
        print("Acesso à Gestão de Utilizadores com sucesso.")

        # 4. Clicar no botão "+ Add User"
        add_user_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), '+ Add User')]"))
        )
        add_user_btn.click()

        # Aguarda o modal aparecer (esperando pelo campo username)
        new_username_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "username"))
        )
        
        # 5. Preencher os dados do novo utilizador
        email_input = driver.find_element(By.NAME, "email")
        password_input_modal = driver.find_element(By.NAME, "password")
        
        # Gerar um ID único baseado no tempo para evitar duplicações em múltiplas execuções do teste
        unique_id = int(time.time())
        test_username = f"novo_user_{unique_id}"
        test_email = f"user_{unique_id}@ipt.pt"
        
        new_username_input.send_keys(test_username)
        email_input.send_keys(test_email)
        password_input_modal.send_keys("PasswordSuperSegura123!")

        # Como é um elemento <select multiple>, usamos a classe Select do Selenium
        roles_select_element = driver.find_element(By.NAME, "roles")
        roles_select = Select(roles_select_element)
        
        # Aguardar que as funções (roles) sejam carregadas da API no select
        WebDriverWait(driver, 10).until(
            lambda d: len(roles_select.options) > 0
        )
        
        # Selecionar a primeira função disponível na lista
        roles_select.select_by_index(0)

        # Clicar em Guardar (Save)
        save_btn = driver.find_element(By.XPATH, "//button[@type='submit' and contains(text(), 'Save')]")
        save_btn.click()

        # 6. Verificar se o modal fechou e se o novo utilizador surge na tabela
        # Vamos usar um bloco try-except para imprimir possíveis alertas de erro
        try:
            # Esperamos encontrar a célula com o novo nome num prazo razoável
            WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.XPATH, f"//td[text()='{test_username}']"))
            )
            print(f"Utilizador '{test_username}' criado com sucesso e verificado na tabela.")
        except Exception as e:
            # Se não encontrou, talvez haja uma mensagem de erro na UI
            try:
                error_el = driver.find_element(By.CLASS_NAME, "error-alert")
                print(f"FALHA na criação: O site mostrou o erro: '{error_el.text}'")
            except:
                print("FALHA na criação: O utilizador não apareceu na tabela e não há mensagem de erro visível.")
            raise e
            
        # 7. Fazer Logout
        # Como estamos na página /manage-users que não tem o Navbar, voltamos primeiro ao dashboard clicando no cabeçalho
        back_to_dashboard = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//h1[text()='Users Management']"))
        )
        back_to_dashboard.click()

        # Aguardar que o dashboard carregue
        WebDriverWait(driver, 10).until(
            EC.url_contains("/dashboard")
        )

        # O botão de logout está dentro do menu hambúrguer no Navbar do Dashboard
        burger_menu = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "burger-menu"))
        )
        burger_menu.click()

        signout_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CLASS_NAME, "signout-item"))
        )
        signout_btn.click()

        # 8. Testar o Login com o utilizador recém-criado
        # Esperar pela página de login
        username_input2 = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "username"))
        )
        password_input2 = driver.find_element(By.ID, "password")

        username_input2.clear()
        password_input2.clear()

        username_input2.send_keys(test_username)
        password_input2.send_keys("PasswordSuperSegura123!")

        submit_button2 = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_button2.click()

        # Verificar se o login teve sucesso (redirect para dashboard)
        WebDriverWait(driver, 10).until(
            EC.url_contains("/dashboard")
        )
        print(f"Login com o novo utilizador '{test_username}' validado com sucesso!")
        
        print("\n--- SUCESSO: Teste de Criação e Login de Utilizador concluído! ---")

    def tearDown(self):
        # Fecha o browser após o teste
        self.driver.quit()

if __name__ == "__main__":
    unittest.main()
