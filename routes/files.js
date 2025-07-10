const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

async function filesRoute(fastify, options) {
  await fastify.register(require('@fastify/multipart'), {
    limits: { fileSize: 10 * 1024 * 1024 }
  });

  fastify.post('/upload', async (request, reply) => {
    try {
      const { type = 'wallets', format = 'csv' } = request.query || {};
      const isTransactions = type === 'transactions';

      const files = await request.saveRequestFiles({ dir: uploadDir });

      const allowed = ['.txt', '.csv', '.xls', '.xlsx'];
      const items = [];
      for (const file of files) {
        const ext = path.extname(file.filename).toLowerCase();
        if (!allowed.includes(ext)) {
          await fs.promises.unlink(file.filepath);
          return reply.code(400).send({
            success: false,
            error: 'Invalid file type. Only txt, csv, xls, xlsx files are allowed.'
          });
        }

        if (ext === '.txt' || ext === '.csv') {
          const content = await fs.promises.readFile(file.filepath, 'utf8');
          content
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .forEach((a) => items.push(a));
        } else if (ext === '.xls' || ext === '.xlsx') {
          const workbook = xlsx.readFile(file.filepath);
          for (const sheetName of workbook.SheetNames) {
            const rows = xlsx.utils.sheet_to_json(
              workbook.Sheets[sheetName],
              { header: 1 }
            );
            rows.forEach((row) => {
              row.forEach((cell) => {
                const addr = String(cell).trim();
                if (addr) items.push(addr);
              });
            });
          }
        }

        // remove processed file
        await fs.promises.unlink(file.filepath);
      }

      const results = [];
      for (const item of items) {
        const url = isTransactions
          ? `/transaction?transactionHash=${encodeURIComponent(item)}`
          : `/balance?address=${encodeURIComponent(item)}`;
        const resp = await fastify.inject({ method: 'GET', url });
        let payload = null;
        if (resp.statusCode < 300) {
          payload = JSON.parse(resp.payload);
        }
        if (isTransactions) {
          results.push({ transactionHash: item, details: payload });
        } else {
          let balance = null;
          if (payload) {
            balance =
              payload.sol ??
              payload.balance ??
              (payload.data ? payload.data.balance : undefined) ??
              (payload.result ? payload.result.value : undefined) ??
              null;
          }
          results.push({ address: item, balance });
        }
      }

      if (format === 'json') {
        return reply.send(results);
      }

      const header = isTransactions
        ? 'transactionHash,details'
        : 'address,balance';
      const csvLines = [header];
      for (const row of results) {
        if (isTransactions) {
          csvLines.push(`${row.transactionHash},${JSON.stringify(row.details)}`);
        } else {
          csvLines.push(`${row.address},${row.balance ?? ''}`);
        }
      }

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename=results.csv');
      return reply.send(csvLines.join('\n'));
    } catch (error) {
      fastify.log.error(error);
      return reply.code(400).send({
        success: false,
        error: 'Failed to upload files',
        details: error.message
      });
    }
  });
}

module.exports = filesRoute;
