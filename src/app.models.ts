export interface Deputy {
    id: string;
    name: string;
    surname?: string;
    patronymic?: string;
    description?: string;
    district?: string;
    party?: string;
    imageUrl?: string;
    date?: CustomDate;
    rating?: number;
    shortName?: string;
}

export interface CustomDate {
    day: number;
    month: number;
    year: number;
}

export interface AppealCard {
    id?: string;
    title: string;
    description?: string;
    deputyId?: string;
    deputyName?: string;
    deputyImageUrl?: string;
    shortName?: string;
    party?: string;
    userName?: string;
    shortNameUser?: string;
    userImageUrl?: string;
    userId?: string;
    status?: string;
    date?: string;
    countFiles?: number;
    countComments?: number;
    fileUrl?: string[];
    fileImageUrl?: string[];
    location?: Location;
}

export interface Location {
    lat: number;
    lng: number;
}

export interface SearchModel {
    searchText: string
}

export interface ResultSearch {
    appeals: AppealCard[],
    deputies: Deputy[]
}

export interface CheckResult {
    isCoincidence: boolean,
    newString: string
}
