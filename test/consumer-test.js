const { getNotesCount } = require('../src/consumers/note.consumer.action');
const { describe, it, after } = require('mocha');
const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = chai;

describe(`Consumer Action`, () => {
    it('should get note ', async () => {
      const event = {
        data: {
            identity: {
                account_id: 1
            }
        }
      };
      const res = await getNotesCount(event)

      expect(res).to.be.a('number');
    });
  });