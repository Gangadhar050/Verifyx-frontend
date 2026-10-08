export const ADMIN_USERS=[{email:'admin@verifyx.com',password:'Admin@123',legacyPasswords:['admin123'],role:'HR',name:'Verify-X HR Admin'},{email:'hr@verifyx.com',password:'Hr@123',legacyPasswords:['hr123'],role:'HR',name:'Verify-X HR'}];
export const STATUS={DRAFT:'Draft',PENDING:'Pending Verification',IN_PROGRESS:'In Progress',APPROVED:'Approved',REJECTED:'Rejected',REUPLOAD:'Re-upload Required'};

// Comprehensive IT skill catalogue used in registration and candidate application.
export const IT_SKILLS = [
  'C','C++','C#','Java','Python','Go','Rust','Kotlin','Swift','Dart','PHP','Ruby','Scala','R','MATLAB','Shell Scripting','Bash','PowerShell',
  'HTML5','CSS3','JavaScript','TypeScript','React.js','Next.js','Redux','Redux Toolkit','Angular','RxJS','Vue.js','Nuxt.js','Svelte','jQuery','Bootstrap','Tailwind CSS','Material UI','Sass/SCSS','Responsive Web Design','Web Accessibility','Web Performance Optimization',
  '.NET','.NET Core','ASP.NET Core','ASP.NET MVC','Entity Framework Core','Spring Boot','Spring MVC','Spring Security','Hibernate/JPA','Node.js','Express.js','NestJS','Django','Flask','FastAPI','Laravel','Ruby on Rails','REST API Development','GraphQL','Microservices','WebSockets','OAuth 2.0','JWT','API Integration','Design Patterns','Object-Oriented Programming','Data Structures & Algorithms','System Design',
  'SQL','MySQL','PostgreSQL','SQL Server','Oracle Database','SQLite','MongoDB','Redis','Cassandra','DynamoDB','Firebase','Firestore','Elasticsearch','Database Design','Query Optimization','PL/SQL','T-SQL',
  'Android Development','Jetpack Compose','iOS Development','SwiftUI','React Native','Flutter','Mobile UI/UX','Mobile API Integration',
  'Manual Testing','Functional Testing','Regression Testing','Integration Testing','API Testing','Automation Testing','Selenium','Cypress','Playwright','Appium','JUnit','TestNG','PyTest','Jest','Postman Testing','Performance Testing','JMeter','Load Testing','Security Testing','Test Automation Frameworks','SDET Practices',
  'Data Analysis','Data Visualization','Pandas','NumPy','SciPy','Statistics','Excel Analytics','Power BI','DAX','Tableau','Looker','ETL','Data Warehousing','Data Modeling','Apache Spark','PySpark','Hadoop','Apache Kafka','Airflow','dbt','Data Engineering','Business Intelligence',
  'Machine Learning','Deep Learning','TensorFlow','PyTorch','Scikit-learn','Natural Language Processing','Computer Vision','Generative AI','Large Language Models','Prompt Engineering','RAG','Vector Databases','LangChain','Model Evaluation','MLOps','Feature Engineering','Model Deployment',
  'AWS','Microsoft Azure','Google Cloud Platform','Cloud Architecture','Serverless Computing','AWS Lambda','Azure Functions','Cloud Security','Cloud Networking','Infrastructure as Code','Terraform','Ansible','Docker','Kubernetes','Helm','CI/CD','Jenkins','GitHub Actions','GitLab CI','DevOps','Site Reliability Engineering','Observability','Prometheus','Grafana','ELK Stack',
  'Linux','Windows Server','System Administration','Network Administration','TCP/IP','DNS','DHCP','Routing & Switching','VPN','VMware','Virtualization','Active Directory','IT Support','Troubleshooting','Hardware Support','Service Desk','ITIL',
  'Cybersecurity','SOC Operations','SIEM','Splunk','Incident Response','Threat Analysis','Vulnerability Assessment','Penetration Testing','Ethical Hacking','OWASP','Network Security','Application Security','Identity & Access Management','Zero Trust','Digital Forensics','Security Auditing','Risk Assessment',
  'SAP ABAP','SAP FICO','SAP MM','SAP SD','SAP HANA','Salesforce Apex','Salesforce Lightning','Salesforce Administration','ServiceNow','RPA','UiPath','Power Automate','Dynamics 365','ERP','CRM',
  'Blockchain','Solidity','Smart Contracts','Web3','IoT','Embedded C','Embedded Systems','Arduino','Raspberry Pi','RTOS','Game Development','Unity','Unreal Engine',
  'UI/UX Design','Figma','Wireframing','Prototyping','User Research','Product Design','Business Analysis','Requirements Gathering','UML','Agile','Scrum','Kanban','Product Management','Project Management','Technical Documentation'
];

export const IT_TOOLS = [
  'Git','GitHub','GitLab','Bitbucket','VS Code','Visual Studio','IntelliJ IDEA','Eclipse','Android Studio','Xcode','PyCharm','Jupyter Notebook','Google Colab',
  'Maven','Gradle','npm','Yarn','pnpm','Postman','Swagger / OpenAPI','Docker Desktop','Kubernetes','Jenkins','GitHub Actions','GitLab CI/CD','Terraform','Ansible','Helm',
  'AWS Console','Azure Portal','Google Cloud Console','Linux Terminal','PowerShell','PuTTY','WinSCP','VMware','VirtualBox',
  'MySQL Workbench','pgAdmin','SQL Server Management Studio','Oracle SQL Developer','MongoDB Compass','Redis Insight','DBeaver',
  'Selenium WebDriver','Cypress','Playwright','Appium','JMeter','SonarQube','Jira','Confluence','Azure DevOps','TestRail',
  'Power BI Desktop','Tableau','Microsoft Excel','Apache Spark','Databricks','Airflow','Kafka','dbt','Hadoop',
  'TensorFlow','PyTorch','Scikit-learn','Hugging Face','LangChain','MLflow','OpenCV','Anaconda',
  'Splunk','Wireshark','Burp Suite','Nmap','Metasploit','Nessus','OWASP ZAP','Kali Linux','Microsoft Sentinel',
  'Figma','Adobe XD','Photoshop','Illustrator','Miro','Balsamiq','Draw.io','Lucidchart',
  'Salesforce','ServiceNow','SAP GUI','UiPath Studio','Power Automate','Unity Editor','Unreal Engine','Arduino IDE'
];

// Backward-compatible export used by older pages.
export const SKILLS = IT_SKILLS;
export const SOFT_SKILLS=['Communication','Team Work','Leadership','Problem Solving','Time Management','Adaptability'];
export const LANGUAGES=['English','Kannada','Hindi','Telugu','Tamil','Marathi','Other'];
export const DOCS_FRESHER=['Resume','Offer Letter','Aadhaar Card','PAN Card'];
export const DOCS_EXPERIENCED=['Resume','Aadhaar','PAN','Bank Details','UAN','Offer Letter 1','Offer Letter 2','Offer Letter 3','Relieving Letter','Experience Letter','Salary Slip 1','Salary Slip 2','Salary Slip 3','Previous Company ID'];
export const MODULES=['Authentication','Candidate Management','Document Upload','Verification Workflow','Reports','Profile'];


const packs = {
  frontend: { skills:['HTML5','CSS3','JavaScript','TypeScript','React.js','Responsive Web Design','REST API Development','Web Accessibility'], tools:['Git','GitHub','VS Code','Postman','Figma'] },
  react: { skills:['React.js','JavaScript','TypeScript','Redux Toolkit','HTML5','CSS3','REST API Development','Responsive Web Design'], tools:['VS Code','Git','GitHub','Postman','npm'] },
  angular: { skills:['Angular','TypeScript','RxJS','JavaScript','HTML5','CSS3','REST API Development'], tools:['VS Code','Git','GitHub','Postman','npm'] },
  vue: { skills:['Vue.js','JavaScript','TypeScript','HTML5','CSS3','REST API Development'], tools:['VS Code','Git','GitHub','Postman','npm'] },
  java: { skills:['Java','Spring Boot','Spring MVC','Spring Security','Hibernate/JPA','SQL','REST API Development','Microservices','Object-Oriented Programming'], tools:['IntelliJ IDEA','Maven','Gradle','Postman','Swagger / OpenAPI','Git','GitHub'] },
  dotnet: { skills:['C#','.NET','.NET Core','ASP.NET Core','Entity Framework Core','SQL','REST API Development','Object-Oriented Programming'], tools:['Visual Studio','VS Code','SQL Server Management Studio','Postman','Swagger / OpenAPI','Git','GitHub'] },
  python: { skills:['Python','Object-Oriented Programming','REST API Development','Django','Flask','FastAPI','SQL'], tools:['PyCharm','VS Code','Postman','Git','GitHub','Jupyter Notebook'] },
  node: { skills:['Node.js','JavaScript','TypeScript','Express.js','NestJS','REST API Development','MongoDB','SQL','Microservices'], tools:['VS Code','npm','Postman','Swagger / OpenAPI','Git','GitHub'] },
  fullstack: { skills:['HTML5','CSS3','JavaScript','TypeScript','React.js','Node.js','REST API Development','SQL','MongoDB','Git'], tools:['VS Code','Git','GitHub','Postman','Docker Desktop','npm'] },
  mobile: { skills:['Mobile API Integration','REST API Development','Mobile UI/UX'], tools:['Android Studio','Xcode','Postman','Git','GitHub'] },
  reactnative: { skills:['React Native','JavaScript','TypeScript','Mobile API Integration','React.js'], tools:['VS Code','Android Studio','Xcode','Git','GitHub'] },
  flutter: { skills:['Flutter','Dart','Mobile API Integration','Mobile UI/UX'], tools:['Android Studio','VS Code','Xcode','Git','GitHub'] },
  android: { skills:['Android Development','Kotlin','Java','Jetpack Compose','Mobile API Integration'], tools:['Android Studio','Gradle','Git','GitHub'] },
  ios: { skills:['iOS Development','Swift','SwiftUI','Mobile API Integration'], tools:['Xcode','Git','GitHub'] },
  testing: { skills:['Manual Testing','Functional Testing','Regression Testing','Integration Testing','API Testing','Test Automation Frameworks'], tools:['Postman','Jira','TestRail','Git'] },
  automation: { skills:['Automation Testing','Selenium','Cypress','Playwright','API Testing','Test Automation Frameworks','Java','Python'], tools:['Selenium WebDriver','Cypress','Playwright','Postman','Jenkins','Git'] },
  devops: { skills:['DevOps','CI/CD','Docker','Kubernetes','Infrastructure as Code','Terraform','Linux','Cloud Architecture'], tools:['Docker Desktop','Kubernetes','Jenkins','GitHub Actions','Terraform','Ansible','Helm','Git'] },
  cloud: { skills:['Cloud Architecture','Cloud Networking','Cloud Security','Serverless Computing','Infrastructure as Code','Docker','Kubernetes'], tools:['AWS Console','Azure Portal','Google Cloud Console','Terraform','Docker Desktop','Git'] },
  dataanalyst: { skills:['Data Analysis','SQL','Microsoft Excel','Power BI','Tableau','Statistics','Data Visualization','Python','Pandas'], tools:['Power BI Desktop','Tableau','Microsoft Excel','Jupyter Notebook','Google Colab','MySQL Workbench'] },
  dataengineer: { skills:['Data Engineering','SQL','Python','ETL','Data Warehousing','Apache Spark','PySpark','Apache Kafka','Airflow','Data Modeling'], tools:['Databricks','Apache Spark','Airflow','Kafka','dbt','Git','Docker Desktop'] },
  datasource: { skills:['Data Science','Python','Pandas','NumPy','Statistics','Machine Learning','Scikit-learn','Data Visualization','SQL'], tools:['Jupyter Notebook','Google Colab','Anaconda','Git','GitHub'] },
  ml: { skills:['Machine Learning','Python','Scikit-learn','Feature Engineering','Model Evaluation','Deep Learning','Model Deployment'], tools:['Jupyter Notebook','Google Colab','TensorFlow','PyTorch','MLflow','Git'] },
  ai: { skills:['Generative AI','Large Language Models','Prompt Engineering','RAG','Vector Databases','Python','Model Evaluation'], tools:['Hugging Face','LangChain','Jupyter Notebook','Google Colab','Git','GitHub'] },
  security: { skills:['Cybersecurity','Network Security','Application Security','Vulnerability Assessment','Incident Response','OWASP','Risk Assessment'], tools:['Kali Linux','Wireshark','Burp Suite','Nmap','Nessus','OWASP ZAP','Splunk'] },
  database: { skills:['SQL','Database Design','Query Optimization','MySQL','PostgreSQL','SQL Server','Oracle Database','PL/SQL'], tools:['MySQL Workbench','pgAdmin','SQL Server Management Studio','Oracle SQL Developer','DBeaver'] },
  network: { skills:['Network Administration','TCP/IP','DNS','DHCP','Routing & Switching','VPN','Troubleshooting'], tools:['Wireshark','PuTTY','Linux Terminal'] },
  support: { skills:['IT Support','Troubleshooting','Hardware Support','Service Desk','Windows Server','Active Directory','ITIL'], tools:['PowerShell','PuTTY','ServiceNow'] },
  uiux: { skills:['UI/UX Design','Wireframing','Prototyping','User Research','Product Design','Responsive Web Design'], tools:['Figma','Adobe XD','Miro','Balsamiq'] },
  salesforce: { skills:['Salesforce Apex','Salesforce Lightning','Salesforce Administration','CRM'], tools:['Salesforce','VS Code','Git'] },
  sap: { skills:['ERP','SAP ABAP','SAP FICO','SAP MM','SAP SD','SAP HANA'], tools:['SAP GUI'] },
  servicenow: { skills:['ServiceNow','ITIL','JavaScript'], tools:['ServiceNow'] },
  rpa: { skills:['RPA','Power Automate'], tools:['UiPath Studio','Power Automate'] },
  embedded: { skills:['Embedded C','Embedded Systems','C','C++','RTOS','IoT'], tools:['Arduino IDE','Git'] },
  blockchain: { skills:['Blockchain','Solidity','Smart Contracts','Web3','JavaScript'], tools:['VS Code','Git','GitHub'] },
  game: { skills:['Game Development','C#','C++'], tools:['Unity Editor','Unreal Engine','Visual Studio','Git'] },
  business: { skills:['Business Analysis','Requirements Gathering','UML','Agile','Scrum','Technical Documentation'], tools:['Jira','Confluence','Miro','Draw.io'] },
};

export function getRoleRecommendations(role='') {
  const r = String(role).toLowerCase();
  let key = 'frontend';
  if (r.includes('react native')) key='reactnative';
  else if (r.includes('react')) key='react';
  else if (r.includes('angular')) key='angular';
  else if (r.includes('vue')) key='vue';
  else if (r.includes('frontend') || r.includes('ui developer') || r.includes('web designer')) key='frontend';
  else if (r.includes('java') || r.includes('spring')) key='java';
  else if (r.includes('.net') || r.includes('c#')) key='dotnet';
  else if (r.includes('python')) key='python';
  else if (r.includes('node') || r.includes('mern') || r.includes('mean')) key=r.includes('mern')||r.includes('mean')?'fullstack':'node';
  else if (r.includes('full stack') || r.includes('software engineer') || r.includes('software developer')) key='fullstack';
  else if (r.includes('flutter')) key='flutter';
  else if (r.includes('android')) key='android';
  else if (r.includes('ios')) key='ios';
  else if (r.includes('mobile')) key='mobile';
  else if (r.includes('automation') || r.includes('sdet')) key='automation';
  else if (r.includes('qa') || r.includes('tester') || r.includes('performance test')) key='testing';
  else if (r.includes('devops') || r.includes('sre') || r.includes('kubernetes') || r.includes('docker') || r.includes('build & release')) key='devops';
  else if (r.includes('cloud') || r.includes('aws') || r.includes('azure') || r.includes('gcp')) key='cloud';
  else if (r.includes('data analyst') || r.includes('power bi') || r.includes('tableau') || r.includes('business intelligence')) key='dataanalyst';
  else if (r.includes('data engineer')) key='dataengineer';
  else if (r.includes('data scientist')) key='datasource';
  else if (r.includes('machine learning') || r.includes('mlops')) key='ml';
  else if (r.includes('ai') || r.includes('generative') || r.includes('nlp') || r.includes('computer vision') || r.includes('prompt')) key='ai';
  else if (r.includes('security') || r.includes('soc') || r.includes('penetration') || r.includes('ethical hacker') || r.includes('iam')) key='security';
  else if (r.includes('database') || r.includes('sql developer') || r.includes('dba')) key='database';
  else if (r.includes('network')) key='network';
  else if (r.includes('support') || r.includes('system administrator') || r.includes('linux administrator')) key='support';
  else if (r.includes('ui/ux') || r.includes('product designer') || r.includes('graphic designer')) key='uiux';
  else if (r.includes('salesforce')) key='salesforce';
  else if (r.includes('sap') || r.includes('erp')) key='sap';
  else if (r.includes('servicenow')) key='servicenow';
  else if (r.includes('rpa')) key='rpa';
  else if (r.includes('embedded') || r.includes('iot')) key='embedded';
  else if (r.includes('blockchain')) key='blockchain';
  else if (r.includes('game')) key='game';
  else if (r.includes('business analyst') || r.includes('system analyst') || r.includes('project manager') || r.includes('scrum master') || r.includes('product manager')) key='business';
  return packs[key] || packs.frontend;
}
