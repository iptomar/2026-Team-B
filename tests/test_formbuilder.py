import time
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains

class TestFormBuilder(unittest.TestCase):
    def setUp(self):
        # Utilizado o Firefox em vez do Chrome/Chromium
        # por problema encontrado no linux que não 
        # funciona corretamente se a aplicação for instalada por flatpak
        from selenium.webdriver.firefox.options import Options
        options = Options()
        
        # options.add_argument('--headless') # Descomente se quiser correr em background
        
        self.driver = webdriver.Firefox(options=options)
        #self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(10)
        self.base_url = "http://localhost:3000"

    def test_formbuilder_flow(self):
        driver = self.driver
        
        # 1. Navegar para a página inicial (Login)
        driver.get(f"{self.base_url}") 

        # 2. Preencher credenciais de Login
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

        # 3. Clicar no botão "Form Builder" na Dashboard
        form_builder_link = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//a[@href='/template-builder']"))
        )
        form_builder_link.click()

        # Aguarda o Form Builder carregar
        WebDriverWait(driver, 10).until(
            EC.url_contains("/template-builder")
        )
        print("Acesso ao Form Builder com sucesso.")
        time.sleep(1) # Aguardar a renderização completa dos componentes

        # 4. Arrastar um componente para o meio (canvas)
        # Identificar um item da paleta (por exemplo, o primeiro item "Heading")
        draggable = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'fb-palette-item')]"))
        )
        
        # Identificar o slot de destino na row vazia
        droppable = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".fb-col-slot"))
        )

        # Executar drag and drop através de JavaScript para forçar os eventos HTML5
        # (React ignora ActionChains em drag and drop nativo porque faltam as propriedades dataTransfer)
        js_drop = """
        const source = arguments[0];
        const target = arguments[1];
        
        const dataTransfer = new DataTransfer();
        
        source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer }));
        target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
        target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
        source.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer }));
        """
        driver.execute_script(js_drop, draggable, droppable)
        print("Componente arrastado para o canvas (via JS events).")
        
        # Pequena pausa para garantir que o estado do React foi atualizado após o drop
        time.sleep(1)

        # 5. Clicar no botão "EXPORT JSON" no topo direito
        export_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[text()='EXPORT JSON']"))
        )
        export_btn.click()
        print("Botão EXPORT JSON clicado.")

        # Pequena pausa para o download ser iniciado pelo browser
        time.sleep(2)
        
        print("\n--- SUCESSO: Teste do FormBuilder concluído! ---")

    def tearDown(self):
        # Fecha o browser após o teste
        self.driver.quit()

if __name__ == "__main__":
    unittest.main()
