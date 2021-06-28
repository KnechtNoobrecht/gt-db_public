<p align="center">
  <img src="./public/resources/icons/logo.png"></img>
</p>

<h1 align="center">GT-DB</h1>
<h3 align="center">Eine Büchereimanagement Web-App für das Gymnasium Trittau</h3>

# Features
<ul>
  <li>Ausleihstatus in Echtzeit</li>
  <li>Benutzerkonten</li>
  <li>Mehrere Berechtigungsebenen</li>
  <li>Modernes, schlichtes Design</li>
</ul>

# Installation
Das Ziel dieser Anleitung ist es, alle Programme so zu installieren und einzustellen, dass die Software autark läuft.
Konkret heißt das, dass im Falle eines Neustarts die Programme von selbst gestartet werden und kein weiterer Benutzereingriff notwendig ist.
Für diese Anleitung nutze ich Ubuntu Server 20.04 als Betriebssystem.</br>
Drei Programme werden benötigt:
- Git
- MongoDB
- Docker
- Docker Compose

### Pakete aktualisieren 

Nutzen Sie `sudo apt update && sudo apt upgrade` um sich zu vergewissern, dass Paketlisten und Pakete auf dem neuesten Stand sind. 

### Docker installieren:

Führen Sie `sudo apt install docker` aus.

### Docker Compose installieren:

Führen Sie `sudo apt install docker-compose` aus.

### MongoDB installieren:

Befolgen Sie <a href="https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/" target="_blank" rel="noopener noreferrer">diese Anleitung.</a>

### Klonen des Quellcodes:

Führen Sie `git clone https://github.com/KnechtNoobrecht/gt-db_public.git` in einem Verzeichnis Ihrer Wahl aus.

### Erstellen der .env-Datei:

Navigieren Sie in das Verzeichnis, in das Sie den Quellcode geklont haben. </br>
Öffnen Sie den Ordner `gt-db_public`. </br>
Erstellen Sie eine `.env`-Datei mit einem Text-Editor Ihrer Wahl.</br>
Ein Beispiel: Führen Sie `nano .env` aus.</br>
Anschließend erstellen Sie vier Einträge.

1. `DBPASSWORDLOCAL`</br>
    Dies ist das Passwort mit dem sich die Webapp zur Datenbank verbindet.
    Sie können es selbst wählen, verwenden Sie jedoch ausschließlich alphanumerische Zeichen.
    
    Beispiel: `DBPASSWORDLOCAL="A6yzNShCTCe8mzVP"`
2. `DBUSER`</br>
    Dieser Eintrag muss wie folgt sein:
    `DBUSER="superuser"`
3. `IPADDRESS`</br>
    Die IP-Addresse, unter der die Datenbank läuft, zu der sich die Webapp verbindet
    
    Beispiel: `IP_ADDRESS="localhost"`
5. `SRVPORT`</br>
    Der Port unter dem der Webserver läuft.
    Zu Testzwecken empfehle ich, einen Port zu wählen, der nicht `80` oder `443` ist, da Linux diese Standardmäßig blockiert, beziehungsweise Adminrechte erfordern,        was aber nicht praktikabel ist.
    
    Beispiel: `SRVPORT="4434"`
    
### MongoDB konfigurieren:
In dem Installationsverzeichnis `gt-db_public` erstellen Sie den Ordner `db` (oder nennen Sie ihn wie Sie möchten) indem Sie `mkdir db` ausführen.</br>
Anschließend führen Sie `sudo chown -R mongodb:mongodb  /pfad/zu/ihrem/datenbankordner` aus, wobei sie `/pfad/zu/ihrem/datenbankordner` mit dem absoluten Pfad zu Ihrem eben erstellten Datenbankordner ersetzen.</br>
Sie haben bereits ein Passwort für MongoDB ausgesucht.</br>
Nun sichern Sie die Datenbank mit diesem Passwort.</br>
Dazu starten Sie die Datenbank mit folgendem Befehl: `mongod --dbpath="./db"`, vorrausgesetzt Sie befinden sich in dem Ordner `gt-db_public`.</br>
Anschließend verbinden Sie sich zur Datenbank, indem Sie `mongo localhost` ausführen. Ersetzen Sie dabei `localhost` durch eine entsprechende IP-Adresse, falls Sie von einem anderen Computer zugreifen.</br>
</br>
Wechseln Sie mit `use admin` zur admin Datenbank.</br>
Anschließend nutzen Sie folgenden Befehl, wobei Sie `changeMeToAStrongPassword` mit Ihrem Passwort ersetzen:
```
db.createUser(
  {
    user: "superuser",
    pwd: "changeMeToAStrongPassword",
    roles: [ "root" ]
  }
)
```
Mit `exit` schließen Sie das Ganze ab.</br>
Bei Problemen lesen Sie bitte <a href="https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/" target="_blank" rel="noopener noreferrer">diesen Artikel.</a></br>

Um zu vermeiden, dass Benutzereingriffe nötig sind, müssen Änderungen an der Konfigurationsdatei vorgenommen werden.</br>
Dazu führen Sie `sudo nano /etc/mongod.conf` aus.</br>

In dieser Datei ändern Sie `dbpath` zu dem absoluten Pfad zu Ihrem Datenbank-Verzeichnis.</br>
Zum Beispiel: `dbpath: /home/julius/gt-db_public/db`</br>
</br>
Außerdem muss die Zeile `#security:` zu `security:` verändert werden, und in der Zeile darunter `authorization: "enabled"` eingefügt werden.
Somit nutzt MongoDB das von Ihnen erstellte Passwort.</br>
Das Endprodukt sollte wie folgt aussehen:</br>
![code snippet](https://user-images.githubusercontent.com/56320300/123632124-dc7da000-d817-11eb-99ec-f0f52848df88.png)
Damit ist die Einrichtung der Datenbank abgeschlossen.

### Zertifikat und Private Key generieren:
Lesen Sie <a href="https://www.ryangeddes.com/how-to-guides/linux/how-to-create-a-self-signed-ssl-certificate-on-linux/" target="_blank" rel="noopener noreferrer">diesen Artikel.</a>

### Node.js App einrichten:
Auf einigen Systemen ist es möglich, dass folgende Befehle nötig sind, um zu gewährleisten, dass Docker ordnungsgemäß funktioniert: 
```
sudo chown $USER /var/run/docker.sock
usermod -G docker $USER
```
Navigieren Sie in den Ordner `gt-db_public` und führen Sie `npm install` aus. </br>
Anschließend führen Sie `docker-compose up` aus und die App wird gestartet.

### Docker und MongoDB beim Systemstart automatisch starten lassen:
Docker: `sudo systemctl enable docker`</br>
MongoDB: `sudo systemctl enable mongod`
