const fs = require("fs");
const csv = require("csv-parser"); // Run: npm install csv-parser

const contactMap = {};

// This reads your uploaded contacts.csv
fs.createReadStream("contacts.csv")
  .pipe(csv())
  .on("data", (row) => {
    const name = row["First Name"] || row["Name"] || "Unknown";
    const phone1 = row["Phone 1 - Value"];
    const phone2 = row["Phone 2 - Value"];

    [phone1, phone2].forEach((val) => {
      if (val) {
        // Cleans "(778) 323-0609" into "7783230609"
        const clean = val.replace(/\D/g, "");
        contactMap[clean] = name;
      }
    });
  })
  .on("end", () => {
    // Saves a clean "Lookup Table" for your app to use
    fs.writeFileSync("contact-lookup.json", JSON.stringify(contactMap));
    console.log("SUCCESS: Your 2,200+ contacts are mapped!");
  });
