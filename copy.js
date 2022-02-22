const { copyFile } = require("fs");
const { resolve } = require("path");

copyFile(resolve(__dirname, "src/api/api-doc.yml"), resolve(__dirname, "dist/api/api-doc.yml"), (error) => {
    if (error) throw error;
    process.stdout.write("Built! \n");
});
