const playwright = require("playwright");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const { PDFDocument, StandardFonts } = require("pdf-lib");

//function to launch the website, get article details and generate pdf
const launchWebsite = async () => {
  //launches a headless browser
  const browser = await playwright.chromium.launch({
    headless: true,
  });

  //opens the given url in a new tab
  const page = await browser.newPage();
  await page.goto("https://stackoverflow.blog/");

  //gets all the required article data using selectors from the page
  const getAllArticleDetails = async () => {
    const AllArticles = await page.$eval("#content", (content) => {
      const data = [];

      const articles = content.getElementsByTagName("article");

      for (const article of articles) {
        const articlDetails = article.querySelector("h2 a");

        const articleExcerpt = article.querySelector("div.lh-excerpt");

        const articleAuthor = article.querySelector(" span a.author");

        const authorImageUrl = article.querySelector("img.avatar.avatar-40");

        const articleImageUrl = article.querySelector("img.wp-post-image");

        //if articleAuthor === null ? it means its a podcast not an article. podcasts not have any author details
        if (!articleAuthor) continue;

        const details = {
          title: articlDetails.innerText,
          link: articlDetails.href,
          excerpt: articleExcerpt.innerText,
          author: articleAuthor.innerText,
          authorImageUrl: authorImageUrl.src,
          articleImageUrl: articleImageUrl.src,
        };

        data.push(details);
      }

      return data;
    });

    return AllArticles;
  };

  //function to download images to /images folder based on url given and returns the image name
  const downloadImages = async (imageUrl, imageName, tag) => {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });

    fs.writeFileSync(`images/${imageName}.${tag}`, response.data);

    return `images/${imageName}.${tag}`;
  };

  //generates the imageName for article Image (not the author image)
  const getArticleImageName = (imageUrl) => {
    const abc = imageUrl.split("/");

    return abc[abc.length - 1].split(".")[0];
  };

  //empty the /images folder so that updated images will be downloaded for new pdf
  const clearImages = async (directory = "images") => {
    for (const image of await fs.readdirSync(directory)) {
      await fs.unlinkSync(path.join(directory, image));
    }
  };

  //returns the current date in required format to print it in pdf
  const getFormattedDate = () => {
    const date = new Date();

    return `Date : ${date.getDate()}/${
      date.getMonth() + 1
    }/${date.getFullYear()}`;
  };

  //find textwidth based on textlength, fontsize
  const getTextWidth = (text, fontSize) => {
    // This is a very rough approximation of text width.
    // For more accurate results, you can use a library that can measure text width.
    return text.length * fontSize * 0.6;
  };

  //function to divide long string into multiple lines based on width availble to display.
  const splitTextIntoLines = (text, maxWidth, fontSize) => {
    const words = text.split(" ");
    const lines = [];

    let currentLine = "";

    for (const word of words) {
      if (getTextWidth(currentLine + " " + word, fontSize) > maxWidth) {
        lines.push(currentLine.trim());
        currentLine = "";
      }

      currentLine += " " + word;
    }

    lines.push(currentLine.trim());

    return lines;
  };

  //function to divide link into multiple lines
  const splitLinkIntoLines = (text, maxWidth, fontSize) => {
    const lines = [];

    let currentLine = "";

    for (const word of text) {
      if (getTextWidth(currentLine + word, fontSize) > maxWidth) {
        lines.push(currentLine.trim());
        currentLine = "";
      }

      currentLine += word;
    }

    lines.push(currentLine.trim());

    return lines;
  };

  //generates pdf based on the article data provided and store it in root folder with file name "output.pdf"
  const generatePDF = async (data) => {
    const pdfDoc = await PDFDocument.create();

    const HelveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (let i = 0; i < data.length; i++) {
      if (i % 2 !== 0) {
        continue;
      }

      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();

      const textWidth = width - 100;
      const miniTextWidth = 220;

      const title = data[i].title;
      const link = data[i].link;
      const excerpt = data[i].excerpt;
      const author = data[i].author;
      const authorImageName = data[i].authorImageName;
      const articleImageName = data[i].articleImageName;

      page.drawText("Latest Stackoverflow Articles", {
        x: 50,
        y: height - 70,
        size: 20,
        font: HelveticaFont,
      });

      page.drawText(getFormattedDate(), {
        x: width - 140,
        y: height - 70,
        size: 12,
        font: HelveticaFont,
      });

      page.drawText(
        "Hello Floks! here is the list of latest articles from Stackoverflow blog, enjoy :)",
        {
          x: 50,
          y: height - 110,
          size: 12,
          font: HelveticaFont,
        }
      );

      // ######### for top article #############

      //for drawing title of article.

      const titleFontSize = 15;
      const titleLineHeight = 20;

      const TitleLines = splitTextIntoLines(title, textWidth, titleFontSize);

      let y = height - 170;
      for (const line of TitleLines) {
        page.drawText(line, { x: 50, y, size: titleFontSize });
        y -= titleLineHeight;
      }

      //for drawing article Image.
      try {
        const articleImage = await pdfDoc.embedJpg(
          fs.readFileSync(articleImageName)
        );

        page.drawImage(articleImage, {
          x: 50,
          y: height - 370,
          width: 300,
          height: 150,
        });
      } catch (err) {}

      //for adding article excerpt
      const excerptFontSize = 12;
      const excerptLineHeight = 15;

      const excerptLines = splitTextIntoLines(
        excerpt,
        miniTextWidth,
        excerptFontSize
      );

      y = height - 230;
      for (const line of excerptLines) {
        page.drawText(line, { x: 370, y, size: excerptFontSize });
        y -= excerptLineHeight;
      }

      //for articlelink
      const linkFontSize = 10;
      const linkLineHeight = 12;

      const LinkLines = splitLinkIntoLines(
        `Know more here : ${link}`,
        miniTextWidth,
        linkFontSize
      );

      y = y - 20;
      for (const line of LinkLines) {
        page.drawText(line, { x: 370, y, size: linkFontSize });
        y -= linkLineHeight;
      }

      //for By, author image and name

      //By
      page.drawText("By", {
        x: 50,
        y: height - 410,
        size: excerptFontSize,
        font: HelveticaFont,
      });

      //author
      try {
        const authorImage = await pdfDoc.embedPng(
          fs.readFileSync(authorImageName)
        );

        page.drawImage(authorImage, {
          x: 80,
          y: height - 420,
          width: 30,
          height: 30,
        });
      } catch (err) {}

      //author name

      page.drawText(author, {
        x: 120,
        y: height - 410,
        size: excerptFontSize,
        font: HelveticaFont,
      });

      //######### for below article ##########

      if (!data[i + 1]) {
        continue;
      }

      const title1 = data[i + 1].title;
      const link1 = data[i + 1].link;
      const excerpt1 = data[i + 1].excerpt;
      const author1 = data[i + 1].author;
      const authorImageName1 = data[i + 1].authorImageName;
      const articleImageName1 = data[i + 1].articleImageName;

      //for drawing title of article.

      const TitleLines1 = splitTextIntoLines(title1, textWidth, titleFontSize);

      y = height - 500;
      for (const line of TitleLines1) {
        page.drawText(line, { x: 50, y, size: titleFontSize });
        y -= titleLineHeight;
      }

      //for drawing article Image.
      try {
        const articleImage1 = await pdfDoc.embedJpg(
          fs.readFileSync(articleImageName1)
        );

        page.drawImage(articleImage1, {
          x: 50,
          y: height - 700,
          width: 300,
          height: 150,
        });
      } catch (err) {}

      //for adding article excerpt

      const excerptLines1 = splitTextIntoLines(
        excerpt1,
        miniTextWidth,
        excerptFontSize
      );

      y = height - 560;
      for (const line of excerptLines1) {
        page.drawText(line, { x: 370, y, size: excerptFontSize });
        y -= excerptLineHeight;
      }

      //for articlelink

      const LinkLines1 = splitLinkIntoLines(
        `Know more here : ${link1}`,
        miniTextWidth,
        linkFontSize
      );

      y = y - 20;
      for (const line of LinkLines1) {
        page.drawText(line, { x: 370, y, size: linkFontSize });
        y -= linkLineHeight;
      }

      //for By, author image and name

      //By
      page.drawText("By", {
        x: 50,
        y: height - 740,
        size: excerptFontSize,
        font: HelveticaFont,
      });

      //author Image
      try {
        const authorImage1 = await pdfDoc.embedPng(
          fs.readFileSync(authorImageName1)
        );

        page.drawImage(authorImage1, {
          x: 80,
          y: height - 750,
          width: 30,
          height: 30,
        });
      } catch (err) {}

      //author name

      page.drawText(author1, {
        x: 120,
        y: height - 740,
        size: excerptFontSize,
        font: HelveticaFont,
      });
    }

    const pdfBytes = await pdfDoc.save();

    fs.writeFileSync("output.pdf", pdfBytes);
  };

  console.log("clearing old images");
  await clearImages();

  console.log("fetching article details");
  const allArticles = await getAllArticleDetails();

  console.log("Downloading article and author images");
  const newArticleList = await Promise.all(
    allArticles.map(async (article) => {
      const authorImgName = await downloadImages(
        article.authorImageUrl,
        article.author,
        "png"
      );

      const articleImg = getArticleImageName(article.articleImageUrl);

      const articleImgName = await downloadImages(
        article.articleImageUrl,
        articleImg,
        "jpeg"
      );

      return {
        ...article,
        authorImageName: authorImgName,
        articleImageName: articleImgName,
      };
    })
  );

  console.log("Generating pdf");
  generatePDF(newArticleList);

  console.log("pdf generated succesfully!");

  //once pdf is generated. it will wait for 5 sec and closes the headless browser.
  await page.waitForTimeout(5000);
  await page.close();
};

//function to send pdf to email server.
const sendEmail = async (emailsList, launchTheWebsite) => {
  //generates updated pdfonlyt if it is real and not testing environment.
  await launchTheWebsite();

  const form = new FormData();

  form.append("toMails", emailsList.join(","));
  form.append("subject", "Latest Stackoverflow blogs");
  form.append(
    "body",
    "Your daily dose of Stackoverflow articles are waiting for you. Check out the attachment!"
  );
  form.append("attachment", fs.createReadStream("./output.pdf"));

  try {
    await axios.post(
      "https://127.0.0.1:9001/v1/mail-server/send/bulk-mail",
      form,
      {
        "Content-Type": "multipart/form-data",
      }
    );
    console.log("Mail Sent!!!");
  } catch (err) {
    console.log("Error while making a post api call", err.message);
  }
};

const emailsList = [
  "manojsaibellamkonda@gmail.com",
  "manojsai.bellamkonda@bounteous.com",
];

sendEmail(emailsList, launchWebsite);

module.exports = { launchWebsite, sendEmail };
