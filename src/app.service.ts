import { Injectable } from '@nestjs/common';
import { Deputy, AppealCard, ResultSearch, CheckResult } from './app.models';
import * as moment from 'moment';
import * as stringSimilarity from 'string-similarity';

const admin = require('firebase-admin');

@Injectable()
export class AppService {
  async searchAppeals(searchText: string): Promise<ResultSearch> {
    const text: string = searchText.toUpperCase();
    const appeals = await this.getInformation();
    const deputies = await this.getAllDeputy();
    const newAppeals: AppealCard[] = this.checkAppeals(appeals, text);
    const newDeputies: Deputy[] = this.checkDeputies(deputies, text);
    const result: ResultSearch = {
      appeals: newAppeals,
      deputies: newDeputies
    };

    return result;
  }

  checkAppeals(appeals, searchText: string): AppealCard[] {
    const newAppeals: AppealCard[] = appeals.filter(appeal => {
      const { title, description, deputyName, party } = appeal;
      const arraySearch: string[] = searchText.split(' ');
      const allString = [title, description, deputyName, party];
      let counter = 0;
      let checkResult: CheckResult[] = [];
      while(allString.length > counter) {
        const result: CheckResult = this.checkStrings(allString[counter], arraySearch);
        checkResult.push(result);
        counter++;
      }
      if (checkResult.find(res => res.isCoincidence == true)) {
        appeal.title = checkResult[0].newString;
        appeal.description = checkResult[1].newString;
        appeal.deputyName = checkResult[2].newString;
        appeal.party = checkResult[3].newString;
        return appeal;
      }
    });

    return newAppeals;
  }

  checkStrings(firstString: string, searchString: string[]): CheckResult {
    const arrayString: string[] = firstString.split(' ');
    let isCoincidence: boolean = false;
    let newString: string = '';
    arrayString.forEach(first => {
      searchString.forEach(search => {
        const coincidence = stringSimilarity.compareTwoStrings(first.toUpperCase(), search);
        if (coincidence >= 0.7 || first.toUpperCase().includes(search)) {
          newString += '<span class="text-mark">' + first + '</span> ';
          isCoincidence = true;
        } else {
          newString += first + ' ';
        }
      });
    });
    const checkedResult: CheckResult = {
      isCoincidence,
      newString
    }
    return checkedResult;
  }

  checkDeputies(deputies, searchText: string): Deputy[] {
    const newDeputies: Deputy[] = deputies.filter(deputy => {
      const { name, patronymic, district, party } = deputy;
      const fullName = name + ' ' + patronymic;
      const arraySearch: string[] = searchText.split(' ');
      const allString = [fullName, district, party];
      let counter = 0;
      let checkResult: CheckResult[] = [];
      while(allString.length > counter) {
        const result: CheckResult = this.checkStrings(allString[counter], arraySearch);
        checkResult.push(result);
        counter++;
      }
      if (checkResult.find(res => res.isCoincidence == true)) {
        deputy.name = checkResult[0].newString;
        deputy.district = checkResult[1].newString;
        deputy.party = checkResult[2].newString;
        return deputy;
      }
    });

    return newDeputies;
  }

  async getInformation() {
    const firestore = new admin.firestore;
    let snapshots = (await firestore.collection('appeals').get()).docs;
      if (snapshots.length) {
          snapshots = snapshots.map((snapshot) => async () =>  {
              const data = snapshot.data();
              const deputy: Deputy = await this.getDeputy(data.deputyId);
              const messageSnaps: number = await this.getCountMessage(snapshot.id);
              const span = await firestore.collection('users').doc(data.userId).get();
              const user = span.data();
              const name: string[] = user.name.split(' ');
              const shortName: string = name[1] ? name[1].substr(0, 1).toUpperCase() : '' + name[0].substr(0, 1).toUpperCase();
              const appeal = {
                  id: snapshot.id,
                  title: data.title,
                  description: data.description,
                  deputyId: data.deputyId,
                  deputyName: deputy.name,
                  deputyImageUrl: deputy.imageUrl,
                  shortName: deputy.shortName,
                  party: deputy.party,
                  userName: user.name,
                  userImageUrl: user.imageUrl,
                  userId: data.userId,
                  shortNameUser: shortName,
                  status: data.status,
                  date: moment(data.date).format('DD-MM-YYYY'),
                  fileUrl: data.fileUrl,
                  fileImageUrl: data.fileImageUrl,
                  countFiles: data.fileUrl ? data.fileUrl.length : 0,
                  countComments: messageSnaps,
                  location: data.location ?  data.location : null
              };

              return appeal;
          });
          return Promise.all(snapshots.map(fn => fn()));
      }
      return [];
  }

  async getDeputy(deputyId: string): Promise<Deputy> {
    let deputy: Deputy;
    const firestore = new admin.firestore;
    await firestore.collection('users').doc(deputyId).get().then(async (snapshot) => {
        const data = snapshot.data();
        const shortName: string = data.surname.substr(0, 1).toUpperCase() + data.name.substr(0, 1).toUpperCase();
        let party: string;
        let district: string;
        if (data.party) {
            party = await this.getName(data.party, 'parties');
        }
        if (data.district) {
            district = await this.getName(data.district, 'districts');
        }
        if (party !== 'Безпартiйний' && party) {
            party = 'Партія «' + party + '»';
        }

        deputy = {
            id: deputyId,
            name: data.surname + ' ' + data.name + ' ' + data.patronymic,
            district: district ? district : null,
            description: data.description ? data.description : null,
            party: party ? party : null,
            date: data.date ? data.date : null,
            imageUrl: data.imageUrl ? data.imageUrl : null,
            shortName: data.imageUrl ? null : shortName,
            rating: data.rating ? data.rating : 0,
        };
      }).catch(err => {
          console.log('err', err);
      });

      return deputy;
  }

  async getName(partyId: string, type: string): Promise<string> {
    let name: string;
    const firestore = new admin.firestore;
    await firestore.collection(type).doc(partyId).get().then(async (snapshot) => {
        const data = snapshot.data();
        name = data.name;
    }).catch(err => {
        console.log('err', err);
    });

    return name;
  }

  async getCountMessage(id): Promise<number> {
    let counter: number = 0;
    const firestore = new admin.firestore;
    const promises = [];
    const dataRef = await firestore.collection('messages').where('appealId', '==', id).get();
    if (dataRef.size) {
        promises.push(new Promise((resolve) => {
            dataRef.forEach(span => {
                const data = span.data();
                if (data.type !== 'confirm') {
                    counter++;
                }
                resolve();
            });
        }));
    }
    await Promise.all(promises);

    return counter;
  }

  async getAllDeputy(): Promise<Deputy[]> {
    let deputies;
    const firestore = new admin.firestore;
    let snapshots = (await firestore.collection('users').where('role', '==', 'deputy').get()).docs;
    if (snapshots.length) {
        deputies = snapshots.map((deputyRes) => async () => {
            const data = deputyRes.data();
            const shortName: string = data.surname.substr(0, 1).toUpperCase() + data.name.substr(0, 1).toUpperCase();
            let party: string;
            let district: string;
            if (data.party) {
                party = await this.getName(data.party, 'parties');
            }
            if (data.district) {
                district = await this.getName(data.district, 'districts');
            }
            if (party !== 'Безпартiйний' && party) {
                party = 'Партія «' + party + '»';
            }
            const name: string =  data.surname + ' ' + data.name;
            const deputy: Deputy = {
                id: deputyRes.id,
                name,
                patronymic: data.patronymic,
                party: party ? party : null,
                rating: data.rating ? data.rating : 0,
                district: district ? district : null,
                imageUrl: data.imageUrl ? data.imageUrl : null,
                shortName
            };
            return deputy;
        });
        return Promise.all(deputies.map(fn => fn()));
    }
    return [];
  }
}
