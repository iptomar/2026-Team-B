const fs = require('fs');
const path = './FrontEnd/src/translations.json';

const translations = JSON.parse(fs.readFileSync(path, 'utf8'));

const newKeys = {
    approvalLifecycle: { en: "Approval Lifecycle", pt: "Ciclo de Aprovação", es: "Ciclo de Aprobación", de: "Genehmigungszyklus", fr: "Cycle d'Approbation", ru: "Цикл утверждения", zh: "审批生命周期", it: "Ciclo di Approvazione", hi: "अनुमोदन जीवनचक्र", ar: "دورة الموافقة" },
    backBtn: { en: "← Back", pt: "← Voltar", es: "← Volver", de: "← Zurück", fr: "← Retour", ru: "← Назад", zh: "← 返回", it: "← Indietro", hi: "← वापस", ar: "← رجوع" },
    statusNeedsCorrection: { en: "Needs Correction", pt: "Necessita Correção", es: "Necesita Corrección", de: "Korrektur erforderlich", fr: "Nécessite une correction", ru: "Требует исправления", zh: "需要修改", it: "Richiede correzione", hi: "सुधार की आवश्यकता है", ar: "يحتاج إلى تصحيح" },
    editResubmitForm: { en: "Edit & Resubmit Form", pt: "Editar & Ressubmeter Formulário", es: "Editar y reenviar formulario", de: "Formular bearbeiten & erneut einreichen", fr: "Modifier et resoumettre le formulaire", ru: "Редактировать и повторно отправить форму", zh: "编辑并重新提交表单", it: "Modifica e reinvia modulo", hi: "संपादित करें और फिर से सबमिट करें", ar: "تعديل وإعادة تقديم النموذج" },
    correctionsRequested: { en: "Corrections Requested", pt: "Correções Solicitadas", es: "Correcciones solicitadas", de: "Korrekturen angefordert", fr: "Corrections demandées", ru: "Запрошены исправления", zh: "请求修改", it: "Correzioni richieste", hi: "सुधार का अनुरोध किया गया", ar: "تصحيحات مطلوبة" },
    startNode: { en: "Start", pt: "Início", es: "Inicio", de: "Start", fr: "Début", ru: "Начало", zh: "开始", it: "Inizio", hi: "शुरू", ar: "البداية" },
    approvalNode: { en: "Approval Step", pt: "Passo de Aprovação", es: "Paso de aprobación", de: "Genehmigungsschritt", fr: "Étape d'approbation", ru: "Шаг утверждения", zh: "审批步骤", it: "Passo di approvazione", hi: "अनुमोदन चरण", ar: "خطوة الموافقة" },
    endNode: { en: "End", pt: "Fim", es: "Fin", de: "Ende", fr: "Fin", ru: "Конец", zh: "结束", it: "Fine", hi: "अंत", ar: "النهاية" },
    waitingFor: { en: "Waiting for:", pt: "A aguardar por:", es: "Esperando por:", de: "Warten auf:", fr: "En attente de :", ru: "В ожидании:", zh: "等待：", it: "In attesa di:", hi: "प्रतीक्षा में:", ar: "في انتظار:" },
    cancelResubmission: { en: "Cancel Resubmission", pt: "Cancelar Ressubmissão", es: "Cancelar reenvío", de: "Wiedereinreichung abbrechen", fr: "Annuler la resoumission", ru: "Отменить повторную отправку", zh: "取消重新提交", it: "Annulla reinvio", hi: "पुनः सबमिशन रद्द करें", ar: "إلغاء إعادة التقديم" },
    resubmitForm: { en: "Resubmit Form", pt: "Ressubmeter Formulário", es: "Reenviar formulario", de: "Formular erneut einreichen", fr: "Resoumettre le formulaire", ru: "Повторно отправить форму", zh: "重新提交表单", it: "Reinvia modulo", hi: "फॉर्म पुनः सबमिट करें", ar: "إعادة تقديم النموذج" },
    readOnlyView: { en: "Read-Only View", pt: "Vista de Apenas Leitura", es: "Vista de solo lectura", de: "Schreibgeschützte Ansicht", fr: "Vue en lecture seule", ru: "Только для чтения", zh: "只读视图", it: "Visualizzazione in sola lettura", hi: "केवल पढ़ने के लिए देखें", ar: "عرض للقراءة فقط" },
    submittedOnText: { en: "Submitted on", pt: "Submetido a", es: "Enviado el", de: "Eingereicht am", fr: "Soumis le", ru: "Отправлено", zh: "提交于", it: "Inviato il", hi: "पर सबमिट किया गया", ar: "تم التقديم في" }
};

Object.assign(translations, newKeys);

fs.writeFileSync(path, JSON.stringify(translations, null, '\t') + '\n', 'utf8');
console.log('Translations updated.');
