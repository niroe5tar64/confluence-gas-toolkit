const doPost = (event: GoogleAppsScript.Events.DoPost) => {
  Logger.log("Webhook received:", event.postData.contents);

  const res = ContentService.createTextOutput(
    JSON.stringify({ message: "Hello World" }),
  ).setMimeType(ContentService.MimeType.JSON);

  return res;
};

export { doPost };
