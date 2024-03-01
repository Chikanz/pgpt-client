import * as yauzl from 'yauzl';
import * as fs from 'fs';
import * as path from 'path';
import { rootExePath } from './paths';

export default function unzip(src: string, dest: string) {
  yauzl.open(path.join(rootExePath, src), { lazyEntries: true }, function(err, zipfile) {
    if (err) throw err;
    zipfile.readEntry();
    zipfile.on('entry', function(entry) {
      const fullPath = path.join(path.join(rootExePath, dest), entry.fileName);
      if (/\/$/.test(entry.fileName)) {
        // If entry is a directory, ensure it exists in the destination.
        fs.mkdirSync(fullPath, { recursive: true });
        zipfile.readEntry();
      } else {
        // Ensure directory exists or create it
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });

        zipfile.openReadStream(entry, function(err, readStream) {
          if (err) throw err;
          // Pipe file content to a new file in the destination directory
          const writeStream = fs.createWriteStream(fullPath);
          readStream.pipe(writeStream).on('finish', function() {
            zipfile.readEntry();
          });
        });
      }
    });
  });
}
