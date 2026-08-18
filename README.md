Step 1: Install Node.js
Go to nodejs.org and download the LTS Windows Installer (.msi).

Run the installer and click through the default options to complete the installation.

Step 2: Clone the Repository
Open your terminal (such as the built-in terminal in VS Code), navigate to where you want the project, and run:

Bash
git clone https://github.com/Tymlyne/KSTU-ATTENDANCE-SYSTEM.git
cd KSTU-ATTENDANCE-SYSTEM
Step 3: Open the Project in VS Code
If they aren't already working inside VS Code, open the cloned folder:

Bash
code .
Step 4: Install Dependencies
Open the integrated terminal in VS Code (Ctrl + ~) and run:

Bash
npm install
Step 5: Run the Application (Two Terminals Required)
Open two separate terminal tabs inside VS Code:

Terminal Tab 1 (Backend Server & Database):

Bash
node server.js
Terminal Tab 2 (Frontend App):

Bash
npm run dev
Ctrl + Click the local URL provided in Terminal Tab 2 (e.g., http://localhost:5173) to open the system in your web browser.
