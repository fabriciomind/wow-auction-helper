import {Dashboard} from '../models/dashboard.model';
import {BehaviorSubject} from 'rxjs';

export class DashboardUtil {
  static list: BehaviorSubject<Dashboard[]> = new BehaviorSubject([]);

  static setLoading(): void {
    this.clearList();
    this.forLoop(10, () => {
      const db = new Dashboard('Loading', '');
      db.columns = [
        {key: 'name', title: '', dataType: ''},
        {key: 'name', title: '', dataType: ''},
        {key: 'name', title: '', dataType: ''}
      ];
      db.idParam = 'id';
      this.forLoop(5, () => db.data.push({id: 25, name: 'Loading…'}));
      this.addToList(db);
    });
  }

  static setBoards(): void {
  }

  static reCalculateBoards(): void {
  }

  static calculateBoard(input): void {
  }

  private static forLoop(length: number, callback: Function) {
    for (let i = 0; i < length; ++i) {
      callback();
    }
  }

  private static addToList(element: any): void {
    this.addToList([...this.list.value, element]);
  }

  private static clearList(): void {
    this.list.next([]);
  }
}
