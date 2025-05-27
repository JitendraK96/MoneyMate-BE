const { describe, it } = require('mocha');
const chai = require('chai');
const app = require('../src/app');

describe('Test app', () => {
  it('it should return "pong"', async () => {
    const response = await chai.request(app)
      .get('/')
      .set({
        'whitelabel-id': 1,
        'account-id': 1,
        'user-id': 1,
      });
    response.body.should.have.property('message').which.to.equal('pong');
  });
});
