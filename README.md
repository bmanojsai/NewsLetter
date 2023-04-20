# NewsLetter

Hello All!

This is a mini node project to genrate a pdf consisting of article details from the stackoverflow blog and to send the generated pdf to single/multiple users using their email ids.

This project uses the following npm packages along with node package.

playwright - for webscrapping
axios - for api call
fs - for file handling like downloading a images,pdf etc
path - for combining paths
form-data - to generate and send the pdf through a post api call in multipart/form-data format.

The email server is located in the following docker => https://hub.docker.com/r/giribabu2000/mail-server
