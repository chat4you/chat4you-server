export interface Status<messageType=undefined> {
    status: 'succes' | 'error';
    message?: messageType;
}