import { WoWHead, WoWHeadSoldBy, WoWHeadDroppedBy, WoWHeadCurrencyFor } from '../models/item/wowhead';
import { Item } from '../models/item/item';

export class WoWHeadUtil {

  public static setValuesAll(body: string): any {
    const wh = new WoWHead();
    wh.expansionId = WoWHeadUtil.getExpansion(body);
    // wh.createdBy = undefined;
    wh.containedInItem = undefined; // contained-in-item
    wh.containedInObject = undefined; // contained-in-object
    wh.currencyFor = WoWHeadUtil.getCurrencyFor(body); // currency-for
    // wh.objectiveOf = undefined;
    wh.soldBy = WoWHeadUtil.getSoldBy(body);
    wh.droppedBy = WoWHeadUtil.getDroppedBy(body);
    // return body;
    return wh;
  }

  public static getExpansion(body: string) {
    const expansionRegex = new RegExp(/Added in patch [0-9]{1,2}\.[0-9]{1,2}/g),
      addedIn = expansionRegex.exec(body);
    if (addedIn && addedIn[0]) {
      return parseInt(addedIn[0].replace('Added in patch ', '').split('.')[0], 10) - 1;
    }
    return 0;
  }

  public static getDroppedBy (body: string): WoWHeadDroppedBy[] {
    const droppedByRegex = new RegExp(/new Listview\({template: 'npc', id: 'dropped-by',([\s\S]*?)}\);/g);
    const dbrx = new RegExp(/data\: ([\s\S]*?)}\);/g);
    const droppedByResult = droppedByRegex.exec(body);
    if (!droppedByResult) {
      return [];
    }
    const droppedBy = JSON.parse(
      dbrx.exec(
        droppedByResult[0])[0]
        .replace('data: ', '')
        .replace('});', '')
        .replace(/,count:/g, ',\"count\":')
        .replace(/,outof:/g, ',\"outof\":')
        .replace(/,personal_loot:/g, ',\"personal_loot\":')
        .replace(/,pctstack:/g, ',\"pctstack\":')
        .replace(/,maxLevel:/g, ',\"maxLevel\":')
        .replace(/1:/g, '\"1\":')
        .replace(/,2:/g, ',\"2\":')
        .replace(/,3:/g, ',\"3\":')
        .replace(/'{/g, '{')
        .replace(/}'/g, '}')
    );

    droppedBy.forEach((npc: WoWHeadDroppedBy) =>
      npc.dropChance = Math.round((npc.count / npc.outof) * 100));

    return droppedBy;
  }

  public static getSoldBy(body: string): WoWHeadSoldBy[] {
    const soldByRegex = new RegExp(/new Listview\({template: 'npc', id: 'sold-by',([\s\S]*?)}\);/g);
    const dbrx = new RegExp(/data\: ([\s\S]*?)}\);/g);
    const soldByResult = soldByRegex.exec(body);
    if (!soldByResult) {
      return [];
    }
    const soldByString = dbrx.exec(
      soldByResult[0])[0]
      .replace('data: ', '')
      .replace('});', '')
      .replace(/stock:/g, '\"stock\":')
      .replace(/cost:/g, '\"cost\":')
      .replace(/stack:/g, '\"stack\":')
      .replace(/'{/g, '{')
      .replace(/}'/g, '}');
      const soldBy = JSON.parse(soldByString) as WoWHeadSoldBy[];
      // const currency = WoWHeadUtil.getCurrency(body);
      if (soldBy) {
        soldBy.forEach((sBy: WoWHeadSoldBy) => {
          WoWHeadUtil.setCurrency(sBy);
          delete sBy.classification;
          delete sBy.type;
        });
      }
    return soldBy;
  }

  public static setCurrency(source: any): void {
    if ((source.cost as Array<any>).length > 0 && source.cost[2] && source.cost[2][0]) {
      source.currency = source.cost[2][0][0];
      source.cost = source.cost[2][0][1];
    } else {
      source.cost = source.cost[0];
    }
  }

  public static getCurrencyFor(body: string): WoWHeadCurrencyFor[] {
    // currency-for
    const currencyForRegex = new RegExp(/new Listview\({template: 'item', id: 'currency-for',([\s\S]*?)}\);/g);
    const dbrx = new RegExp(/data\: ([\s\S]*?)}\);/g);
    const currencyForResult = currencyForRegex.exec(body);
    if (!currencyForResult) {
      return [];
    }
    const currencyForString = dbrx.exec(
      currencyForResult[0])[0]
      .replace('data: ', '')
      .replace('});', '')
      .replace(/stock:/g, '\"stock\":')
      .replace(/cost:/g, '\"cost\":')
      .replace(/stack:/g, '\"stack\":')
      .replace(/'{/g, '{')
      .replace(/}'/g, '}');
    const currencyFor = JSON.parse(currencyForString);
    if (currencyFor) {
      currencyFor.forEach((obj: WoWHeadCurrencyFor) => {
        WoWHeadUtil.setCurrency(obj);
        delete obj.classs;
        delete obj.flags2;
        delete obj.subclass;
        delete obj.slot;
        delete obj.skill;
      });
    }
    return currencyFor;
  }
}