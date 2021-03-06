import {AuctionHandler} from './auction.handler';
import {AuctionUpdateLog} from '../models/auction/auction-update-log.model';
import {DateUtil} from '@ukon1990/js-utilities';
import {S3Handler} from './s3.handler';
import {DatabaseUtil} from '../utils/database.util';
import {environment} from '../../../client/src/environments/environment';
import {NPCUtil} from '../utils/npc.util';

const PromiseThrottle: any = require('promise-throttle');

describe('AuctionHandler', () => {
  beforeEach(() => environment.test = false);
  afterEach(() => environment.test = true);

  describe('getUpdateLog', () => {
    it('Can get the last 3 hours', async () => {
      const log: AuctionUpdateLog = await new AuctionHandler().getUpdateLog(69, 3);
      expect(log.entries.length).toBeLessThanOrEqual(3);
      expect(log.entries.length).toBeGreaterThanOrEqual(2);
      expect(log.minTime).toBeTruthy();
      expect(log.avgTime).toBeTruthy();
      expect(log.maxTime).toBeTruthy();
    });

    it('Can get the last 3 hours', async () => {
      const log: AuctionUpdateLog = await new AuctionHandler().getUpdateLog(69, 2);
      expect(log.entries.length).toBeLessThanOrEqual(2);
      expect(log.entries.length).toBeGreaterThanOrEqual(1);
      expect(log.minTime).toBe(70);
      expect(log.avgTime).toBe(70);
      expect(log.maxTime).toBe(70);
    });
  });

  it('can add daily data from hourly', async () => {
    jest.setTimeout(1000000000);
    const conn = new DatabaseUtil(false);
    const promiseThrottle = new PromiseThrottle({
      requestsPerSecond: 1,
      promiseImplementation: Promise
    });
    const promises = [];
    let processed = 0;
    const date = '2020-02-05'; // 02-04
    for (let id = 1; id <= 260; id++) {// 242
        promises.push(promiseThrottle.add(() =>
          new Promise((resolve) => {
            new AuctionHandler().compileDailyAuctionData(id, conn, new Date(date))
              .then(() => {
                processed++;
                console.log(`Processed count: ${processed} of ${260}`);
                resolve();
              })
              .catch((error) => {
                processed++;
                console.error(`ah=${id} date=${date}`, error);
                resolve();
              });
          })));
    }

    await Promise.all(promises)
      .catch(console.error);
    conn.end();
    expect(1).toBeTruthy();
  });

  xit('Generate daily fields', () => {
    let str = '';
    for (let i = 1; i < 32; i++) {
      const day = i < 10 ? '0' + i : '' + i;
      str += '`minHour' + day + '` SMALLINT(2) NULL,\n';
      str += '`min' + day + '` BIGINT(20) NULL,\n';
      str += '`avg' + day + '` BIGINT(20) NULL,\n';
      str += '`max' + day + '` BIGINT(20) NULL,\n';
      str += '`minQuantity' + day + '` MEDIUMINT NULL,\n';
      str += '`avgQuantity' + day + '` MEDIUMINT NULL,\n';
      str += '`maxQuantity' + day + '` MEDIUMINT NULL,\n';
    }
    console.log(str);
    expect(str).toBeTruthy();
  });

  xit('Adding stuff to db', async () => {
    jest.setTimeout(1000000000);
    const promiseThrottle = new PromiseThrottle({
      requestsPerSecond: 5,
      promiseImplementation: Promise
    });
    const s3 = new S3Handler(),
      conn = new DatabaseUtil(false);
    const promises = [];
    let totalLength = 0;
    let processed = 0;
    for (const s3Region of [{id: 'eu', list: ['eu']}, {id: 'us', list: ['us']}, {id: 'as', list: ['kr', 'tw']}]) {
      for (const region of s3Region.list) {
        // 95
        // Alt frem til og med id=20
        const realmId = 21;
        for (let id = 141; id <= 141; id++) {// 242
          const bucket = 'wah-data-' + s3Region.id;
          const list = await s3.list(bucket, `auctions/${region}/${id}/`)
            .catch(console.error);
          const day = 20; // 17
          const startDay = +new Date(`1/${day}/2020`),
            endDay = +new Date(`1/31/2020`), // max: 1/21/2020
            filteredFiles = list.Contents.filter(file =>
              +new Date(file.LastModified) >= startDay &&
              +new Date(file.LastModified) <= endDay)
              .sort((a, b) =>
                +new Date(b.LastModified) - +new Date(a.LastModified));

          totalLength += filteredFiles.length;
          for (const file of filteredFiles) {
            promises.push(promiseThrottle.add(() =>
              new Promise((resolve) => {
                const splitted = file.Key.split('/');
                const [auctions, region1, ahId, fileName] = splitted;
                const date = new Date(+fileName
                  .replace('-lastModified', '')
                  .replace('.json.gz', '').toString());
                new AuctionHandler().processAuctions(region,
                  {
                    bucket: {name: bucket},
                    object: {key: file.Key, size: 0},
                    s3SchemaVersion: '',
                    configurationId: ''
                  }, ahId,
                  fileName.replace('.json.gz', ''),
                  conn)
                  .then(() => {
                    processed++;
                    console.log(`region=${region} ah=${id} date=${date}`);
                    console.log(`Processed count: ${processed} of ${totalLength}`);
                    resolve();
                  })
                  .catch((error) => {
                    processed++;
                    console.error(`region=${region} ah=${id} date=${date}`, error);
                    resolve();
                  });
              })));
          }
        }
      }
    }

    await Promise.all(promises)
      .catch(console.error);
    conn.end();
    expect(1).toBe(1);
  });
});
