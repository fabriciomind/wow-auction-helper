import {Request, Response} from 'express';
import {Auction} from '../models/auction/auction';
import {Endpoints} from '../endpoints';

const PromiseThrottle: any = require('promise-throttle');
const request: any = require('request');
const RequestPromise = require('request-promise');


export class AuctionUtil {
/*
  public static getAuctions(req: Request, res: Response): void {
    const url = req.body.url;

    if (url && url.indexOf('.worldofwarcraft.com/auction-data') !== -1) {
      request(url).pipe(res);
    } else {
      res.send({
        realms: [],
        auctions: []
      });
    }
  }*/
  public static getAuctions(req: Request, res: Response): void {
    const url = req.body.url;

    if (url && url.indexOf('.worldofwarcraft.com/auction-data') !== -1) {
      request.get(url, (error, response, body) => {
        if (error) {
          res.send({
            realms: [],
            auctions: []
          });
          console.error('getAuctions', error);
          return;
        }
        res.send(AuctionUtil.removeUnused(JSON.parse(body)));
      });
    } else {
      res.send({
        realms: [],
        auctions: []
      });
    }
  }

  private static removeUnused(auctionResponse) {
    const response = {
      realms: auctionResponse.realms,
      auctions: auctionResponse.auctions as Auction[]
    };

    response.auctions.forEach((auction: Auction) => {
      // delete auction.auc;
      delete auction.context;
      delete auction.rand;
      delete auction.seed;
    });

    return response;
  }

  public static getWoWUction(req: any, res: Response): void {
    AuctionUtil.processWoWUction(
      res,
      `http://www.wowuction.com/${
      req.body.region
      }/${
        req.body.realm
      }/alliance/Tools/RealmDataExportGetFileStatic?token=${
        req.body.key
      }`
    );
  }

  private static processWoWUction(res: Response, wowUctionURL: string): void {
    request.get(wowUctionURL, (err, re, body) => {
      const list: any[] = [],
        obj = {};
      let tempObj: any = {},
        isFirst = true;
      // 5 == itemID, 7 == market price,
      // 14 == Avg Daily Posted, 15 == Avg Estimated Daily Sold,
      // 16 == Estimated demand
      body.split('\n').forEach(l => {
        if (isFirst) {
          isFirst = false;
          // console.log(l.split('\t'));
        } else {
          tempObj = l.split('\t');
          list.push({
            id: parseInt(tempObj[4], 10),
            mktPrice: parseInt(tempObj[6], 10),
            avgDailyPosted: parseFloat(tempObj[15]),
            avgDailySold: parseFloat(tempObj[16]),
            estDemand: parseFloat(tempObj[17]),
            dailyPriceChange: parseFloat(tempObj[14])
          });
        }
      });
      res.send(list);
    });
  }

  static getSnapshotForRealm(req, res) {
    request.get(new Endpoints().getPath(
      `auction/data/${req.params.realm}`,
      req.params.region),
      (error, response, body) => {
        if (error) {
          res.send({
            files: [{
              lastModified: undefined,
              url: ''
            }]
          });
          console.error('get auction data url failed', error);
          return;
        }
        res.send(JSON.parse(body));
      });
  }
}
