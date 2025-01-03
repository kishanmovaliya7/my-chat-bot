const nodemailer = require("nodemailer");
var fs = require("fs");
const sqlite3 = require("sqlite3");

// function chunk(array, size) {
//   const chunked_arr = [];
//   let index = 0;
//   while (index < array.length) {
//     chunked_arr.push(array.slice(index, size + index));
//     index += size;
//   }
//   return chunked_arr;
// }

// const snowflakeResult = async (query, credential) => {
//   return await new Promise((resolve, reject) => {
//     var connection = snowflake.createConnection(credential);
//     connection.connect(async function (err, conn) {
//       if (err) {
//         reject(err);
//       } else {
//         conn.execute({
//           sqlText: query,
//           complete: function (err, stmt, rows) {
//             if (err) {
//               reject(err);
//             } else {
//               resolve(rows);
//             }
//             connection.destroy();
//           },
//         });
//       }
//     });
//   });
// };

// const basicFtp = async (filename, time, scheduleResponse) => {
//   try {
//     const client = new ftp.Client(200000);
//     client.ftp.verbose = true;
//     return await new Promise(async (resolve, reject) => {
//       try {
//         await client.access({
//           host: scheduleResponse.host,
//           port: parseInt(scheduleResponse.sftp_port),
//           username: scheduleResponse.username,
//           password: new Buffer(
//             scheduleResponse.sftp_password,
//             'base64'
//           ).toString('binary'),
//           secure: true,
//         });

//         await client.uploadFrom(
//           `assets/${filename}_${time}.csv`,
//           `upload/Proximo/NABCA/${filename}_${time}.csv`
//         );
//         console.log('Uploaded successfully');
//         await client.close();
//         resolve('success');
//       } catch (err) {
//         reject(err);
//       }
//     });
//   } catch (error) {
//     console.log('FTP Connection failed');
//   }
// };

// const basicSFtp = async (filename, time, scheduleResponse) => {
//   try {
//     const sftp = new SFTP();
//     return await new Promise(async (resolve, reject) => {
//       try {
//         await sftp.connect({
//           host: scheduleResponse.host,
//           port: parseInt(scheduleResponse.sftp_port),
//           username: scheduleResponse.username,
//           password: new Buffer(
//             scheduleResponse.sftp_password,
//             'base64'
//           ).toString('binary'),
//         });

//         await sftp.put(
//           `assets/${filename}_${time}.csv`,
//           `/upload/Proximo/NABCA/${filename}_${time}.csv`
//         );
//         console.log('Uploaded successfully');
//         await sftp.end();
//         resolve('success');
//       } catch (err) {
//         reject(err);
//       }
//     });
//   } catch (error) {
//     console.log('SFTP connection failed');
//   }
// };
// Function to run SQL queries
const db = new sqlite3.Database("rawData.db", (err) => {
  if (err) {
    console.log("Error Occurred - " + err.message);
  } else {
    console.log("Database Connected");
  }
});

const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
};

async function mailerFunction(iterator) {
  const {
    Name,
    reportName,
    email,
    reportFilter,
    scheduler,
    isDeleted,
    emailLists,
    created_at,
  } = iterator;
  // `SELECT * FROM Policy
  // WHERE Start Date = ?
  // AND Expiry Date = ?
  // AND Field = ?
  // AND Class of Business = ?
  // AND Currency = ?;`
  if (reportName === "Policy") {
    const sql = `SELECT * FROM Policy 
    WHERE Start Date = ? 
    AND Expiry Date = ? 
    AND Class of Business = ? 
    AND Currency = ?;`;
    
    console.log("iterator", JSON.stringify(reportFilter));
    const params = [
      reportFilter.StartDate,
      reportFilter.EndDate,
      reportFilter.ClassOfBusiness,
      reportFilter.Currency,
    ];

    const policyData = await query(sql, params);
    console.log("policyData", policyData);
  }

  if (reportName === "Claims") {
    const sql = `SELECT * FROM Claims WHERE email = "${email}";`;
    const claimsData = await query(sql);
    console.log("claimsData", claimsData);
  }

  if (reportName === "Premium") {
    const sql = `SELECT * FROM Premium WHERE email = "${email}";`;
    const premiumData = await query(sql);
    console.log("PremiumData", premiumData);
  }

  // if (type === 'email') {
  //   if (queryIds) {
  //     const ids = queryIds.map((ress) => parseInt(ress));
  //     const sqlQuery = `SELECT * FROM "query"  WHERE configId LIKE '% ${id} %' AND status = 1 AND enabled = 1`;
  //     const [queryResponse] = await db.sequelize.query(sqlQuery);
  //     if (queryResponse.length) {
  //       const time = moment(new Date()).format('YYYYMMDD_HHmmss');
  //       let snowflakeData = [];
  //       let updatedBody = body;
  //       const querys = queryResponse.map((ress) => ress.query).join('; ');
  //       for (const queryId of ids) {
  //         const queryData = await db.query.findOne({
  //           where: { id: queryId, enabled: 1 },
  //         });

  //         if (queryData) {
  //           const { query, filename } = queryData;
  //           try {
  //             const snowflakeResponse = await db.snowflake.findOne({
  //               where: { clientname, sourcename },
  //               attributes: [
  //                 'account',
  //                 'username',
  //                 'pass',
  //                 'database',
  //                 'warehouse',
  //                 'schema',
  //                 'role',
  //               ],
  //             });

  //             if (snowflakeResponse) {
  //               snowflakeData = await snowflakeResult(query, {
  //                 ...snowflakeResponse.toJSON(),
  //                 password: snowflakeResponse.toJSON().pass,
  //               });

  //               var rowdata = '';
  //               var grandTotal = [];

  //               const header = Object.keys(snowflakeData[0]);
  //               const data = snowflakeData;
  //               const total = {};
  //               for (const res of data) {
  //                 for (const iterator of header) {
  //                   total[iterator] = (total[iterator] || 0) + res[iterator];
  //                 }
  //               }
  //               const tableData = `<table
  //             style="text-align: center; border-spacing: 0; width: auto; border: 1px solid #80808063; margin-bottom: 10px"
  //             cellpadding="10px"
  //           >
  //             <thead style="background-color: #dddddd; border: 2px">
  //               <tr>
  //               ${header
  //                 ?.map((res) => {
  //                   return `<th>${res}</th>`;
  //                 })
  //                 .join('')}
  //               </tr>
  //             </thead>
  //             <tbody>
  //             ${data
  //               ?.map((res) => {
  //                 let aa = '<tr>';
  //                 for (const iterator of header) {
  //                   total[iterator] = total[iterator] || 0 + res[iterator];
  //                   aa +=
  //                     `<td style="text-align:${
  //                       isNaN(res[iterator]) ? 'left' : 'right'
  //                     }; font-weight: ${
  //                       isNaN(res[header[0]]) &&
  //                       (res[header[0]]?.toLowerCase().includes('total') ||
  //                         res[header[0]]
  //                           ?.toLowerCase()
  //                           .includes('grand total'))
  //                         ? 600
  //                         : 'normal'
  //                     }">` +
  //                     res[iterator] +
  //                     '</td>';
  //                 }
  //                 aa += '</tr>';
  //                 return aa;
  //               })
  //               .join('')}

  //             </tbody>
  //           </table>`;
  //               updatedBody = updatedBody.replace(
  //                 '</span>QueryResult</span>',
  //                 `</span>${tableData}</span>`
  //               );
  //             } else {
  //               throw {
  //                 message: 'Snowflack data not found!',
  //               };
  //             }
  //           } catch (error) {
  //             const data = {
  //               configId: id,
  //               query: query,
  //               status: 'Failed',
  //               reason: error.message,
  //               creation_date: new Date().getTime(),
  //             };
  //             const response = await db.stats.create(data);
  //             return response;
  //           }
  //         }
  //       }

  //       const transporter = nodemailer.createTransport(
  //         smtpTransport({
  //           host: smtp,
  //           port: port,
  //           auth: {
  //             user: email,
  //             pass: new Buffer(password, 'base64').toString('binary'),
  //           },
  //           secureConnection: false,
  //           tls: {
  //             rejectUnauthorized: false,
  //           },
  //         })
  //       );

  //       updatedBody = updatedBody
  //         .replace('</span>TimeStamp</span>', `</span><b>${time}</b></span>`)
  //         .replace('</span>FileName</span>', `</span><b></b></span>`)
  //         .replace(
  //           '</span>RowCount</span>',
  //           `</span><b>${snowflakeData?.length}</b></span>`
  //         )
  //         .replace('</span>QueryResult</span>', `</span></span>`)
  //         .replace(/<p>/g, '<p style="margin:0">');

  //       await transporter.sendMail({
  //         from: email,
  //         to: to,
  //         subject: subject,
  //         html: updatedBody,
  //       });

  //       const bodyData = {
  //         configId: id,
  //         query: querys,
  //         status: 'Succeeded',
  //         creation_date: new Date().getTime(),
  //       };

  //       const response = await db.stats.create(bodyData);
  //       return response;
  //     }
  //   } else {
  //     const sqlQuery = `SELECT * FROM "query"  WHERE configId LIKE '% ${id} %' AND status = 1 AND enabled = 1`;
  //     const [queryResponse] = await db.sequelize.query(sqlQuery);
  //     if (queryResponse.length) {
  //       for (const queryData of queryResponse) {
  //         let { query, filename } = queryData;
  //         filename = filename.replace(/ /g, '_');
  //         try {
  //           const snowflakeResponse = await db.snowflake.findOne({
  //             where: { clientname, sourcename },
  //             attributes: [
  //               'account',
  //               'username',
  //               'pass',
  //               'database',
  //               'warehouse',
  //               'schema',
  //               'role',
  //             ],
  //           });

  //           if (snowflakeResponse) {
  //             const snowflakeData = await snowflakeResult(query, {
  //               ...snowflakeResponse.toJSON(),
  //               password: snowflakeResponse.toJSON().pass,
  //             });

  //             var rowdata = '';
  //             var tableData = '';
  //             var grandTotal = [];
  //             const time = moment(new Date()).format('YYYYMMDD_HHmmss');
  //             if (filename) {
  //               if (snowflakeData?.length) {
  //                 rowdata = Object.keys(snowflakeData[0]).join('\t') + '\n';
  //               }
  //               for (var i = 0; i < snowflakeData?.length; i++) {
  //                 grandTotal[i] = grandTotal[i] ? grandTotal[i] : [];
  //                 grandTotal[i] = grandTotal[i];
  //                 rowdata =
  //                   rowdata +
  //                   Object.values(snowflakeData[i]).join('\t') +
  //                   '\n';
  //               }
  //               fs.appendFile(
  //                 `assets/${filename}_${time}.xls`,
  //                 rowdata,
  //                 (err) => {
  //                   if (err) throw err;
  //                   console.log('File created');
  //                 }
  //               );
  //             } else {
  //               const header = Object.keys(snowflakeData[0]);
  //               const data = snowflakeData;
  //               const total = {};
  //               for (const res of data) {
  //                 for (const iterator of header) {
  //                   total[iterator] = (total[iterator] || 0) + res[iterator];
  //                 }
  //               }
  //               tableData = `<table
  //           style="text-align: center; border-spacing: 0; width: auto;"
  //           cellpadding="10px"
  //         >
  //           <thead style="background-color: #dddddd; border: 2px">
  //             <tr>
  //             ${header
  //               ?.map((res) => {
  //                 return `<th>${res}</th>`;
  //               })
  //               .join('')}
  //             </tr>
  //           </thead>
  //           <tbody>
  //           ${data
  //             ?.map((res) => {
  //               let aa = '<tr>';
  //               for (const iterator of header) {
  //                 total[iterator] = total[iterator] || 0 + res[iterator];
  //                 aa += '<td>' + res[iterator] + '</td>';
  //               }
  //               aa += '</tr>';
  //               return aa;
  //             })
  //             .join('')}
  //           <tr><th>Grand Total</th>${Object.values(total)
  //             .filter((res, i) => i != 0)
  //             .map((res) => '<th>' + res + '</th>')
  //             .join('')}</tr>
  //           </tbody>
  //         </table>`;
  //             }

  //             const transporter = nodemailer.createTransport(
  //               smtpTransport({
  //                 host: smtp,
  //                 port: port,
  //                 auth: {
  //                   user: email,
  //                   pass: new Buffer(password, 'base64').toString('binary'),
  //                 },
  //                 secureConnection: false,
  //                 tls: {
  //                   rejectUnauthorized: false,
  //                 },
  //               })
  //             );
  //             const updatedBody = body
  //               .replace(
  //                 '</span>TimeStamp</span>',
  //                 `</span><b>${time}</b></span>`
  //               )
  //               .replace(
  //                 '</span>FileName</span>',
  //                 `</span><b>${filename}</b></span>`
  //               )
  //               .replace(
  //                 '</span>RowCount</span>',
  //                 `</span><b>${snowflakeData?.length}</b></span>`
  //               )
  //               .replace(
  //                 '</span>QueryResult</span>',
  //                 `</span>${tableData}</span>`
  //               )
  //               .replace(/<p>/g, '<p style="margin:0">');
  //             await transporter.sendMail({
  //               from: email,
  //               to: to,
  //               subject: subject,
  //               html: updatedBody,
  //               attachments: fs.existsSync(`assets/${filename}_${time}.csv`)
  //                 ? [
  //                     {
  //                       filename: `${filename}_${time}.csv`,
  //                       path: `assets/${filename}_${time}.csv`,
  //                     },
  //                   ]
  //                 : undefined,
  //             });
  //             fs.unlink(`assets/${filename}_${time}.xls`, () => {});

  //             const bodyData = {
  //               configId: id,
  //               query: query,
  //               status: 'Succeeded',
  //               creation_date: new Date().getTime(),
  //             };

  //             const response = await db.stats.create(bodyData);
  //             return response;
  //           } else {
  //             throw {
  //               message: 'Snowflack data not found!',
  //             };
  //           }
  //         } catch (error) {
  //           const data = {
  //             configId: id,
  //             query: query,
  //             status: 'Failed',
  //             reason: error.message,
  //             creation_date: new Date().getTime(),
  //           };
  //           const response = await db.stats.create(data);
  //           return response;
  //         }
  //       }
  //     }
  //   }
  // }
  // if (type === 'export') {
  //   console.log('queryIds', queryIds);
  //   if (queryIds) {
  //     try {
  //       const ids = queryIds.map((ress) => parseInt(ress));
  //       const sqlQuery = `SELECT * FROM "query"  WHERE configId LIKE '% ${id} %' AND status = 1 AND enabled = 1`;
  //       const [queryResponse] = await db.sequelize.query(sqlQuery);
  //       const filename = 'unknown';
  //       if (queryResponse.length) {
  //         const time = moment().format('YYYYMMDDhhmmss');
  //         let snowflakeData = [];
  //         let updatedBody = body;
  //         const querys = queryResponse.map((ress) => ress.query).join('; ');
  //         for (const queryId of ids) {
  //           const queryData = await db.query.findOne({
  //             where: { id: queryId, enabled: 1 },
  //           });

  //           if (queryData) {
  //             const { query } = queryData;
  //             try {
  //               const snowflakeResponse = await db.snowflake.findOne({
  //                 where: { clientname, sourcename },
  //                 attributes: [
  //                   'account',
  //                   'username',
  //                   'pass',
  //                   'database',
  //                   'warehouse',
  //                   'schema',
  //                   'role',
  //                 ],
  //               });

  //               if (snowflakeResponse) {
  //                 snowflakeData = await snowflakeResult(query, {
  //                   ...snowflakeResponse.toJSON(),
  //                   password: snowflakeResponse.toJSON().pass,
  //                 });

  //                 const header = Object.keys(snowflakeData[0]);
  //                 const data = snowflakeData;
  //                 const total = {};
  //                 for (const res of data) {
  //                   for (const iterator of header) {
  //                     total[iterator] =
  //                       (total[iterator] || 0) + res[iterator];
  //                   }
  //                 }
  //                 const tableData = `<table
  //             style="text-align: center; border-spacing: 0; width: auto; border: 1px solid #80808063; margin-bottom: 10px"
  //             cellpadding="10px"
  //           >
  //             <thead style="background-color: #dddddd; border: 2px">
  //               <tr>
  //               ${header
  //                 ?.map((res) => {
  //                   return `<th>${res}</th>`;
  //                 })
  //                 .join('')}
  //               </tr>
  //             </thead>
  //             <tbody>
  //             ${data
  //               ?.map((res) => {
  //                 let aa = '<tr>';
  //                 for (const iterator of header) {
  //                   total[iterator] = total[iterator] || 0 + res[iterator];
  //                   aa +=
  //                     `<td style="text-align:${
  //                       isNaN(res[iterator]) ? 'left' : 'right'
  //                     }; font-weight: ${
  //                       isNaN(res[header[0]]) &&
  //                       (res[header[0]]?.toLowerCase().includes('total') ||
  //                         res[header[0]]
  //                           ?.toLowerCase()
  //                           .includes('grand total'))
  //                         ? 600
  //                         : 'normal'
  //                     }">` +
  //                     res[iterator] +
  //                     '</td>';
  //                 }
  //                 aa += '</tr>';
  //                 return aa;
  //               })
  //               .join('')}

  //             </tbody>
  //           </table>`;
  //                 updatedBody = updatedBody.replace(
  //                   '</span>QueryResult</span>',
  //                   `</span>${tableData}</span>`
  //                 );
  //               } else {
  //                 throw {
  //                   message: 'Snowflack data not found!',
  //                 };
  //               }
  //             } catch (error) {
  //               console.log('Config Id:', id);

  //               const data = {
  //                 configId: id,
  //                 query: query,
  //                 status: 'Failed',
  //                 reason: error.message,
  //                 creation_date: new Date().getTime(),
  //               };
  //               const response = await db.stats.create(data);
  //               return response;
  //             }
  //           }
  //         }
  //         console.log('Config Id 1111:', snowflakeData.length);
  //         let rowdata = '';

  //         if (snowflakeData?.length) {
  //           rowdata = Object.keys(snowflakeData[0]).join(',') + '\n';
  //           try {
  //             const data = await chunk(snowflakeData, 500000);
  //             for (const iterator1 of data) {
  //               for (const iterator of iterator1) {
  //                 rowdata =
  //                   rowdata + Object.values(iterator).join(',') + '\n';
  //               }
  //             }
  //           } catch (error) {
  //             throw error;
  //           }
  //         }
  //         await fs.appendFile(
  //           `assets/${filename}_${time}.csv`,
  //           rowdata,
  //           (err) => {
  //             if (err) {
  //               console.log('Error in Creating file with query id', err);
  //               throw err;
  //             }
  //             console.log('File created');
  //           }
  //         );

  //         const transporter = nodemailer.createTransport(
  //           smtpTransport({
  //             host: smtp,
  //             port: port,
  //             auth: {
  //               user: email,
  //               pass: new Buffer(password, 'base64').toString('binary'),
  //             },
  //             secureConnection: false,
  //             tls: {
  //               rejectUnauthorized: false,
  //             },
  //           })
  //         );

  //         updatedBody = updatedBody
  //           .replace(
  //             '</span>TimeStamp</span>',
  //             `</span><b>${time}</b></span>`
  //           )
  //           .replace('</span>FileName</span>', `</span><b></b></span>`)
  //           .replace(
  //             '</span>RowCount</span>',
  //             `</span><b>${snowflakeData?.length}</b></span>`
  //           )
  //           .replace('</span>QueryResult</span>', `</span></span>`)
  //           .replace(/<p>/g, '<p style="margin:0">');

  //         if (scheduleResponse.protocol === 'ftp') {
  //           await basicFtp(filename, time, scheduleResponse);
  //         }

  //         if (scheduleResponse.protocol === 'sftp') {
  //           await basicSFtp(filename, time, scheduleResponse);
  //         }

  //         await transporter.sendMail({
  //           from: email,
  //           to: to,
  //           subject: subject,
  //           html: updatedBody,
  //           attachments: fs.existsSync(`assets/${filename}_${time}.csv`)
  //             ? [
  //                 {
  //                   filename: `${filename}_${time}.csv`,
  //                   path: `assets/${filename}_${time}.csv`,
  //                 },
  //               ]
  //             : undefined,
  //         });
  //         console.log('Config Id:', id);

  //         fs.unlink(`assets/${filename}_${time}.csv`, () => {});

  //         const bodyData = {
  //           configId: id,
  //           query: querys,
  //           status: 'Succeeded',
  //           creation_date: new Date().getTime(),
  //         };

  //         const response = await db.stats.create(bodyData);
  //         return response;
  //       }
  //     } catch (error) {
  //       console.log('Config Id catch export error:', error);

  //       const queryData = await db.query.findOne({
  //         where: { id: queryIds[0], enabled: 1 },
  //       });

  //       const data = {
  //         configId: id,
  //         query: queryData?.query,
  //         status: 'Failed',
  //         reason: error?.message,
  //         creation_date: new Date().getTime(),
  //       };
  //       console.log('Config Id catch export data:', data);
  //       const response = await db.stats.create(data);
  //       console.log('Config Id catch export response:', response);
  //       return response;
  //     }
  //   } else {
  //     const sqlQuery = `SELECT * FROM "query"  WHERE configId LIKE '% ${id} %' AND status = 1 AND enabled = 1`;
  //     const [queryResponse] = await db.sequelize.query(sqlQuery);
  //     if (queryResponse.length) {
  //       for (const queryData of queryResponse) {
  //         let { query, filename } = queryData;
  //         filename = filename.replace(/ /g, '_');
  //         console.log('filenamefilename', filename);
  //         try {
  //           const snowflakeResponse = await db.snowflake.findOne({
  //             where: { clientname, sourcename },
  //             attributes: [
  //               'account',
  //               'username',
  //               'pass',
  //               'database',
  //               'warehouse',
  //               'schema',
  //               'role',
  //             ],
  //           });
  //           if (snowflakeResponse) {
  //             const snowflakeData = await snowflakeResult(query, {
  //               ...snowflakeResponse.toJSON(),
  //               password: snowflakeResponse.toJSON().pass,
  //             });
  //             console.log(snowflakeData.length);
  //             var rowdata = '';
  //             var tableData = '';
  //             const time = moment(new Date()).format('YYYYMMDD_HHmmss');
  //             console.log('filenamefilename', filename);

  //             if (filename) {
  //               console.log('file', filename);
  //               if (snowflakeData?.length) {
  //                 rowdata = Object.keys(snowflakeData[0]).join(',') + '\n';
  //               }
  //               try {
  //                 const data = await chunk(snowflakeData, 500000);
  //                 for (const iterator1 of data) {
  //                   for (const iterator of iterator1) {
  //                     rowdata =
  //                       rowdata + Object.values(iterator).join(',') + '\n';
  //                   }
  //                 }
  //               } catch (error) {
  //                 throw error;
  //               }

  //               await fs.writeFile(
  //                 `assets/${filename}_${time}.csv`,
  //                 rowdata,
  //                 (err) => {
  //                   if (err) {
  //                     console.log('err', err);
  //                     throw err;
  //                   }
  //                   console.log('File created');
  //                 }
  //               );
  //             } else {
  //               const header = Object.keys(snowflakeData[0]);
  //               console.log('qwqwqw', header);
  //               const data = snowflakeData;
  //               const total = {};
  //               for (const res of data) {
  //                 for (const iterator of header) {
  //                   total[iterator] = (total[iterator] || 0) + res[iterator];
  //                 }
  //               }
  //               tableData = `<table
  //           style="text-align: center; border-spacing: 0; width: auto;"
  //           cellpadding="10px"
  //         >
  //           <thead style="background-color: #dddddd; border: 2px">
  //             <tr>
  //             ${header
  //               ?.map((res) => {
  //                 return `<th>${res}</th>`;
  //               })
  //               .join('')}
  //             </tr>
  //           </thead>
  //           <tbody>
  //           ${data
  //             ?.map((res) => {
  //               let aa = '<tr>';
  //               for (const iterator of header) {
  //                 total[iterator] = total[iterator] || 0 + res[iterator];
  //                 aa += '<td>' + res[iterator] + '</td>';
  //               }
  //               aa += '</tr>';
  //               return aa;
  //             })
  //             .join('')}
  //           <tr><th>Grand Total</th>${Object.values(total)
  //             .filter((res, i) => i != 0)
  //             .map((res) => '<th>' + res + '</th>')
  //             .join('')}</tr>
  //           </tbody>
  //         </table>`;
  //             }

  //             const transporter = nodemailer.createTransport(
  //               smtpTransport({
  //                 host: smtp,
  //                 port: port,
  //                 auth: {
  //                   user: email,
  //                   pass: new Buffer(password, 'base64').toString('binary'),
  //                 },
  //                 secureConnection: false,
  //                 tls: {
  //                   rejectUnauthorized: false,
  //                 },
  //               })
  //             );

  //             const updatedBody = body
  //               .replace(
  //                 '</span>TimeStamp</span>',
  //                 `</span><b>${time}</b></span>`
  //               )
  //               .replace('</span>FileName</span>', `</span><b></b></span>`)
  //               .replace(
  //                 '</span>RowCount</span>',
  //                 `</span><b>${snowflakeData?.length}</b></span>`
  //               )
  //               .replace(
  //                 '</span>QueryResult</span>',
  //                 `</span>${tableData}</span>`
  //               )
  //               .replace(/<p>/g, '<p style="margin:0">');
  //             console.log('Config export else updatedBody:', updatedBody);

  //             if (scheduleResponse.protocol === 'ftp') {
  //               await basicFtp(filename, time, scheduleResponse);
  //             }
  //             if (scheduleResponse.protocol === 'sftp') {
  //               await basicSFtp(filename, time, scheduleResponse);
  //             }

  //             await transporter.sendMail({
  //               from: email,
  //               to: to,
  //               subject: subject,
  //               html: updatedBody,
  //               attachments: fs.existsSync(`assets/${filename}_${time}.csv`)
  //                 ? [
  //                     {
  //                       filename: `${filename}_${time}.csv`,
  //                       path: `assets/${filename}_${time}.csv`,
  //                     },
  //                   ]
  //                 : undefined,
  //             });

  //             fs.unlink(`assets/${filename}_${time}.csv`, () => {});
  //             console.log('Config Id 1111:', id);
  //             const bodyData = {
  //               configId: id,
  //               query: query,
  //               status: 'Succeeded',
  //               creation_date: new Date().getTime(),
  //             };

  //             const response = await db.stats.create(bodyData);
  //             return response;
  //           } else {
  //             console.log('sdfsd');
  //             throw {
  //               message: 'Snowflack data not found!',
  //             };
  //           }
  //         } catch (error) {
  //           console.log('Config Id catch export error:', error);
  //           console.log('Config Id catch export:', id);
  //           const data = {
  //             configId: id,
  //             query: query,
  //             status: 'Failed',
  //             reason: error.message,
  //             creation_date: new Date().getTime(),
  //           };
  //           const response = await db.stats.create(data);
  //           return response;
  //         }
  //       }
  //     }
  //   }
  // }
}

module.exports = mailerFunction;
