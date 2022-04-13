# upload-widget-js

In this repository you can find a PatchKit upload widget example, by default configured to a staging environment.

To use this widget on your own website:

1. See **pkWidget_server** implementation and run or implement something similar on your backend.
2. Use **pkWidget** and customize it to your needs.

## Local testing

1. Run the server first
	Just open the 'server_start.bat' (on windows)
	or run index.js with node in a terminal, 'node ./index.js' (node.js >= v13)
2. Run pkWidget on a local web server (live server in vscode, xampp, apache)
3. Open dev tools in the web browser (F12)
4. If you got a CORS errors, you need to run the web browser with disabled security
	Google 'open web browser without cors'
	To do it in chrome on windows, you can modify shortcut. Set 'Target' to smth like that:
	"C:\Program Files\Google\Chrome\Application\chrome.exe" --disable-web-security --user-data-dir=C://chromeTemp
	Or run web browser with required flags from the terminal

### Changing environment

By default the example code uses staging environment. To get it working with the production environment:

1. Edit **pkWidget_server/config.js** and enable production environment.
2. Edit **pkWidget/src/config.js** and enable production environment.
