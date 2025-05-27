const { Op } = require('sequelize');
const { describe, it, after } = require('mocha');
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../src/app');
const { sequelizeManager } = require('../src/managers');

const { NoteModel } = sequelizeManager;

chai.use(chaiHttp);

// eslint-disable-next-line no-unused-vars
const should = chai.should();

const headers = {
  'whitelabel-id': 1,
  'account-id': 1,
  'user-id': 1,
};
const gt255 = `This website stores cookies on your computer.
These cookies are used to collect information about how you interact with our website and
allow us to remember you.We use this information in order to improve and customize your
browsing experience and for analytics and metrics about our visitors both on this website and other media`;

const baseUrl = '/notes';

/**
 * Bulk Create
 */

const createTestData = async () => NoteModel.bulkCreate([{
  name: `test-${Math.floor(100000 + Math.random() * 900000)}`,
  account_id: 1,
  status: 1,
}, {
  name: `test-${Math.floor(100000 + Math.random() * 900000)}`,
  account_id: 1,
  status: 1,
},
{
  name: `test-${Math.floor(100000 + Math.random() * 900000)}`,
  account_id: 1,
  status: 2,
}, {
  name: `test-${Math.floor(100000 + Math.random() * 900000)}`,
  account_id: 1,
  status: 2,
}, {
  name: `test-${Math.floor(100000 + Math.random() * 900000)}`,
  account_id: 1,
  deleted: 1,
  deleted_at: new Date(),
}]);

const createOne = async () => NoteModel.create({
  name: 'test',
  account_id: 1,
  status: 2,
});

const getOne = async ({ status, account_id = 1 }) => NoteModel.findOne({
  where: {
    account_id,
    status,
  },
});

const getDeletedOne = async () => NoteModel.findOne({
  where: {
    account_id: 1,
    deleted_at: {
      [Op.ne]: null,
    },
  },
  paranoid: false,
});

const getLastRowId = async () => NoteModel.max('id');

const getList = async ({ account_id = 1, limit = 10 }) => NoteModel.findAll({
  where: {
    account_id,
  },
  limit,
});

const deleteAll = async ({ account_id = 1 }) => NoteModel.destroy({
  where: {
    account_id,
  },
});

describe('Notes Test Suit', async () => {
  describe(`POST ${baseUrl}`, () => {
    it('should create bulk test data.', async () => {
      // eslint-disable-next-line no-unused-vars
      await createTestData();
    });

    it('should create a note. ', async () => {
      const body = {
        name: String(Math.floor(100000 + Math.random() * 900000)),
      };
      const res = await chai.request(app)
        .post(`${baseUrl}`)
        .set(headers)
        .send(body);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('note')
        .which
        .is
        .an('object');
    });

    it('should give validation error because name can not be blank.', async () => {
      const body = {
        name: '',
      };

      const res = await chai
        .request(app)
        .post(`${baseUrl}`)
        .send(body)
        .set(headers);

      res.should.have.status(400);
      res.error.should.not.be.false;
    });

    it('should give validation error because name is not string.', async () => {
      const body = {
        name: 123,
      };

      const res = await chai
        .request(app)
        .post(`${baseUrl}`)
        .send(body)
        .set(headers);
      res.should.have.status(400);
      res.error.should.not.be.false;
    });

    it('should give validation error because body contains a unknown field [xyz].', async () => {
      const body = {
        xyz: 123,
      };

      const res = await chai
        .request(app)
        .post(`${baseUrl}`)
        .send(body)
        .set(headers);

      res.should.have.status(400);
      res.error.should.not.be.false;
    });

    it('should give validation error because name length is grater than 255 characters.', async () => {
      const body = {
        name: gt255,
      };

      const res = await chai
        .request(app)
        .post(`${baseUrl}`)
        .send(body)
        .set(headers);

      res.should.have.status(400);
      res.error.should.not.be.false;
    });
  });

  describe(`PUT ${baseUrl}/:noteId`, () => {
    const updatedName = String(Math.floor(100000 + Math.random() * 900000));
    const body = {
      name: updatedName,
      version: 1,
    };
    it('should update a note of given id.', async () => {
      const note = await getOne({
        status: 1,
      });

      const res = await chai.request(app)
        .put(`${baseUrl}/${note.id}`)
        .set(headers)
        .send(body);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('note')
        .which
        .is
        .an('object')
        .that
        .has
        .property('name')
        .which
        .is
        .equal(String(updatedName));
    });

    it('should update a note name of given id.', async () => {
      const note = await getOne({
        status: 1,
      });

      const tempBody = {
        name: String(Math.floor(100000 + Math.random() * 900000)),
        version: 2,
      };
      const res = await chai.request(app)
        .put(`${baseUrl}/${note.id}`)
        .set(headers)
        .send(tempBody);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('note')
        .which
        .is
        .an('object')
        .that
        .has
        .property('name')
        .which
        .is
        .equal(tempBody.name);
    });

    it('should update a note description of given id.', async () => {
      const note = await getOne({
        status: 1,
      });

      const tempBody = {
        description: String(Math.floor(100000 + Math.random() * 900000)),
        version: 3,
      };
      const res = await chai.request(app)
        .put(`${baseUrl}/${note.id}`)
        .set(headers)
        .send(tempBody);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('note')
        .which
        .is
        .an('object')
        .that
        .has
        .property('description')
        .which
        .is
        .equal(tempBody.description);
    });

    it('should return 412 preconditionfailed error because new version', async () => {
      const note = await getOne({
        status: 1,
      });

      body.version += 5;
      const res = await chai.request(app)
        .put(`${baseUrl}/${note.id}`)
        .set(headers)
        .send(body);

      res.should.have.status(412);
      res.body.should.be.a('object');
      res.body.should.have.property('error')
        .which
        .is
        .an('object')
        .that
        .has
        .property('message')
        .which
        .is
        .an('string');
    });

    it('should return NotFound error.', async () => {
      const noteId = await getLastRowId();

      const res = await chai.request(app)
        .put(`${baseUrl}/${noteId + 1}`)
        .set(headers)
        .send(body);

      res.should.have.status(404);
      res.body.should.be.a('object');
      res.body.should.have.property('error')
        .which
        .is
        .an('object')
        .that
        .has
        .property('code')
        .which
        .is
        .an('number')
        .which
        .is
        .equal(404);
    });
  });

  describe(`PUT ${baseUrl}/:noteId?enable=true`, async () => {
    it('should enable a note of given note id.', async () => {
      const note = await getOne({
        status: 2,
      });

      const res = await chai.request(app)
        .put(`${baseUrl}/${note.id}?enable=true`)
        .set(headers);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('note')
        .which
        .is
        .an('object')
        .that
        .has
        .property('status')
        .which
        .is
        .equal(1);

      const { version } = res.body.data.note;
      version.should.eql(note.version + 1);
    });

    it('should give 412 precondition error because given note is already enabled.', async () => {
      const note = await getOne({
        status: 1,
      });
      const res = await chai.request(app)
        .put(`${baseUrl}/${note.id}?enable=true`)
        .set(headers);

      res.should.have.status(412);
      res.body.should.be.a('object');
      res.body.should.have.property('error')
        .which
        .is
        .an('object')
        .that
        .has
        .property('message')
        .which
        .is
        .an('string');
    });

    it('should give 404 notfound error because given note is not exist.', async () => {
      const noteId = await getLastRowId();

      const res = await chai.request(app)
        .put(`${baseUrl}/${noteId + 1}?enable=true`)
        .set(headers);

      res.should.have.status(404);
      res.body.should.be.a('object');
      res.body.should.have.property('error')
        .which
        .is
        .an('object')
        .that
        .has
        .property('message')
        .which
        .is
        .an('string');
    });
  });

  describe(`PUT ${baseUrl}/:noteId?enable=false`, async () => {
    it('should disable a note of given id.', async () => {
      const note = await getOne({
        status: 1,
      });

      const res = await chai.request(app)
        .put(`${baseUrl}/${note.id}?enable=false`)
        .set(headers);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('note')
        .which
        .is
        .an('object')
        .that
        .has
        .property('status')
        .which
        .is
        .equal(2);

      const { version } = res.body.data.note;
      version.should.eql(note.version + 1);
    });

    it('should give 412 precondition error because given note is already disabled.', async () => {
      const note = await getOne({
        status: 2,
      });

      const res = await chai.request(app)
        .put(`${baseUrl}/${note.id}?enable=false`)
        .set(headers);

      res.should.have.status(412);
      res.body.should.be.a('object');
      res.body.should.have.property('error')
        .which
        .is
        .an('object')
        .that
        .has
        .property('message')
        .which
        .is
        .an('string');
    });

    it('should give 401 notfound error because given note is not exist.', async () => {
      const noteId = await getLastRowId();

      const res = await chai.request(app)
        .put(`${baseUrl}/${noteId + 1}?enable=false`)
        .set(headers);

      res.should.have.status(404);
      res.body.should.be.a('object');
      res.body.should.have.property('error')
        .which
        .is
        .an('object')
        .that
        .has
        .property('message')
        .which
        .is
        .an('string');
    });
  });

  describe(`GET ${baseUrl}/`, () => {
    it('should return list of note', async () => {
      const res = await chai.request(app)
        .get(`${baseUrl}/`)
        .set(headers);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('notes')
        .which
        .is
        .an('array');
    });

    it('should return list of note with status = 2', async () => {
      const res = await chai.request(app)
        .get(`${baseUrl}?status=2`)
        .set(headers);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('notes')
        .which
        .is
        .an('array');
    });

    it('should return list of notes of given ids  ', async () => {
      const notes = await getList({ status: 1 });
      const ids = (notes.map((note) => note.id)).join(';');
      const res = await chai.request(app)
        .get(`${baseUrl}?ids=${ids}`)
        .set(headers);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('notes')
        .which
        .is
        .an('array');
    });

    it('should return list of notes which contains 111', async () => {
      const res = await chai.request(app)
        .get(`${baseUrl}?search=111`) // at least 3 char needed
        .set(headers);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('notes')
        .which
        .is
        .an('array');
    });

    it('should give validation error because parameters [sort_by] can not be empty.', async () => {
      const res = await chai.request(app)
        .get(`${baseUrl}?sort_by=`)
        .set(headers);

      res.should.have.status(400);
      res.error.should.not.be.false;
    });

    it('should give validation error because page_no can not be a garbage value.', async () => {
      const res = await chai
        .request(app)
        .get(`${baseUrl}?page_no=@#78sdac`)
        .set(headers);

      res.should.have.status(400);
      res.error.should.not.be.false;
    });

    it('should give validation error because page_no can not be a string.', async () => {
      const res = await chai
        .request(app)
        .get(`${baseUrl}?page_no=abc`)
        .set(headers);

      res.should.have.status(400);
      res.error.should.not.be.false;
    });

    it('should give validation error because status can not be more than 2', async () => {
      const res = await chai
        .request(app)
        .get(`${baseUrl}?status=6`)
        .set(headers);

      res.should.have.status(400);
      res.error.should.not.be.false;
    });

    it('should give validation error because status can not be a decimal value.', async () => {
      const res = await chai
        .request(app)
        .get(`${baseUrl}?status=22.45`)
        .set(headers);

      res.should.have.status(400);
      res.error.should.not.be.false;
    });

    it('should give validation error because status can not be a negative value.', async () => {
      const res = await chai
        .request(app)
        .get(`${baseUrl}?status=-1`)
        .set(headers);

      res.should.have.status(400);
      res.error.should.not.be.false;
    });

    it('should give validation error because status can not be other than 0, 1 or 2.', async () => {
      const res = await chai
        .request(app)
        .get(`${baseUrl}?status=167445774435678`)
        .set(headers);

      res.should.have.status(400);
      res.error.should.not.be.false;
    });

    it('should give validation error because duplicate parameters are not allowed.', async () => {
      const res = await chai
        .request(app)
        .get(`${baseUrl}?sort_by=id&page_no=1&sort_by=id`)
        .set(headers);

      res.should.have.status(400);
      res.error.should.not.be.false;
    });
  });

  describe(`GET ${baseUrl}/count`, async () => {
    it('should return count of notes', async () => {
      const res = await chai.request(app)
        .get(`${baseUrl}/count`)
        .set(headers);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('count')
        .which
        .is
        .an('number');
    });

    it('should return count of notes for status 1', async () => {
      const res = await chai.request(app)
        .get(`${baseUrl}/count?status=1`)
        .set(headers);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('count')
        .which
        .is
        .an('number');
    });

    it('should return count of notes contains 111', async () => {
      const res = await chai.request(app)
        .get(`${baseUrl}/count?search=111`) // at least 3 char needed
        .set(headers);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('count')
        .which
        .is
        .an('number');
    });

    it('should return count of notes contains ids', async () => {
      const notes = await getList({ account_id: 1 });
      const res = await chai.request(app)
        .get(`${baseUrl}/count?ids=${notes[0].id}`) // at least 3 char needed
        .set(headers);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('count')
        .which
        .is
        .an('number');
    });

    it('should give validation error because status can not be more than 2', async () => {
      const res = await chai
        .request(app)
        .get(`${baseUrl}/count?status=6`)
        .set(headers);

      res.should.have.status(400);
      res.error.should.not.be.false;
    });
  });

  describe(`GET ${baseUrl}/noteId`, async () => {
    it('should return one note of given id.', async () => {
      const note = await getOne({
        status: 1,
      });
      const res = await chai.request(app)
        .get(`${baseUrl}/${note.id}`)
        .set(headers);
      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .which
        .has
        .property('note');
    });

    it('should give 404 not found error because data is not exist in DB', async () => {
      const lastRowId = await getLastRowId();
      const res = await chai.request(app)
        .get(`${baseUrl}/${Number(lastRowId) + 1}`) // or Any imaginary number, which should not exists as note id.
        .set(headers);
      res.should.have.status(404);
      res.body.should.be.a('object');
      res.body.should.have.property('error')
        .which
        .is
        .an('object')
        .which
        .has
        .property('message')
        .which
        .is
        .an('string');
    });

    it('should give 404 not found error because given id is a deleted note.', async () => {
      const note = await getDeletedOne();
      const res = await chai.request(app)
        .get(`${baseUrl}/${note.id}`)
        .set(headers);
      res.should.have.status(404);
      res.body.should.be.a('object');
      res.body.should.have.property('error')
        .which
        .is
        .an('object')
        .which
        .has
        .property('message')
        .which
        .is
        .an('string');
    });
  });

  describe(`DELETE ${baseUrl}/noteId`, () => {
    it('should delete one of given id', async () => {
      const note = await getOne({
        status: 2,
      });
      const res = await chai.request(app)
        .delete(`${baseUrl}/${note.id}`)
        .set(headers);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .which
        .has
        .property('note')
        .that
        .has
        .property('deleted_at')
        .which
        .is
        .not
        .equal(null);
    });

    it('should give 412 precondition error because enable note can not be deleted.', async () => {
      const note = await getOne({
        status: 1,
      });
      const res = await chai.request(app)
        .delete(`${baseUrl}/${note.id}`)
        .set(headers);

      res.should.have.status(412);

      res.body.should.be.a('object');
      res.body.should.have.property('error')
        .which
        .is
        .an('object')
        .that
        .has
        .property('message')
        .which
        .is
        .an('string');
    });
    it('should give precondition failed  because enable note can not be deleted and force update is not provided.', async () => {
      const note = await getOne({
        status: 1,
      });
      const preReq = await chai.request(app)
        .delete(`${baseUrl}/${note.id}`)
        .set(headers);
      console.log('preReq.body');
      console.log(JSON.stringify(preReq.body));
      const { recovery } = preReq.body.error;

      let forceOption = {};
      recovery.options.forEach((option) => {
        if (option.name === 'force') {
          forceOption = option;
        }
      });
      console.log('FFFF', forceOption);
      console.log(forceOption.recovery_param.path);
      const res = await chai.request(app)
        .delete(`${forceOption.recovery_param.path}`)
        .set(headers);
      res.body.should.be.a('object');
      res.body.should.have.property('error')
        .which
        .is
        .an('object')
        .that
        .has
        .property('message')
        .which
        .is
        .an('string');
    });
    it('should  delete  because enable note can be deleted with force_update option.', async () => {
      const note = await getOne({
        status: 1,
      });
      const preReq = await chai.request(app)
        .delete(`${baseUrl}/${note.id}`)
        .set(headers);
      console.log('preReq.body');
      console.log(JSON.stringify(preReq.body));
      const { recovery } = preReq.body.error;

      let forceOption = {};
      recovery.options.forEach((option) => {
        if (option.name === 'force') {
          forceOption = option;
        }
      });
      console.log('FFFF', forceOption);
      console.log(forceOption.recovery_param.path);
      const res = await chai.request(app)
        .delete(`${forceOption.recovery_param.path}?force_update=true`)
        .set(headers);
      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .which
        .has
        .property('note')
        .that
        .has
        .property('deleted_at')
        .which
        .is
        .not
        .equal(null);
    });
  });

  describe(`PUT ${baseUrl}`, () => {
    it('should removed all notes. ', async () => {
      const body = {
        notes: [

        ],
      };
      const res = await chai.request(app)
        .put(`${baseUrl}`)
        .set(headers)
        .send(body);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('notes')
        .which
        .is
        .an('array');
    });

    it('should update a notes. ', async () => {
      const body = {
        notes: [
          {
            name: String(Math.floor(100000 + Math.random() * 900000)),
          },
        ],
      };
      const res = await chai.request(app)
        .put(`${baseUrl}`)
        .set(headers)
        .send(body);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('notes')
        .which
        .is
        .an('array');
    });

    it('should update existing note. ', async () => {
      const notes = await getList({ account_id: 1 });

      const body = {
        notes: [
          {
            id: notes[0].id,
            name: String(Math.floor(100000 + Math.random() * 900000)),
          },
          {
            name: String(Math.floor(100000 + Math.random() * 900000)),
          },
        ],
      };
      const res = await chai.request(app)
        .put(`${baseUrl}`)
        .set(headers)
        .send(body);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('notes')
        .which
        .is
        .an('array')
        .that.has.lengthOf(body.notes.length);
    });

    it('should give precondition error because note is not exist.', async () => {
      const id = await getLastRowId();

      const body = {
        notes: [
          {
            id: id + 1000,
            name: String(Math.floor(100000 + Math.random() * 900000)),
          },
        ],
      };

      const res = await chai
        .request(app)
        .put(`${baseUrl}`)
        .send(body)
        .set(headers);
      res.should.have.status(412);
      res.error.should.not.be.false;
    });
  });

  describe('GET /name/suggest/:name', async () => {
    after(async () => {
      await deleteAll({ account_id: 1 });
    });
    it('should give name suggestion', async () => {
      const note = await createOne();
      const res = await chai.request(app)
        .get(`${baseUrl}/${note.id}/copy-names`)
        .set(headers);
      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('name')
        .which
        .is
        .an('string');
    });

    it('should return note notfound', async () => {
      const noteId = await getLastRowId();

      const res = await chai.request(app)
        .get(`${baseUrl}/${noteId + 1}/copy-names`)
        .set(headers);
      res.should.have.status(404);
      res.body.should.be.a('object');
      res.body.should.have.property('error')
        .which
        .is
        .an('object')
        .that
        .has
        .property('message')
        .which
        .is
        .an('string');
    });
  });

  describe('POST /notes/:id/copy', async () => {
    after(async () => {
      await deleteAll({ account_id: 1 });
    });
    it('should copy note', async () => {
      const note = await createOne();
      const res = await chai.request(app)
        .post(`${baseUrl}/${note.id}/copy`)
        .set(headers);

      console.log(res.body);
      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('note')
        .which
        .is
        .an('object');
    });

    it('should return note notfound - copy note', async () => {
      const noteId = await getLastRowId();

      const res = await chai.request(app)
        .post(`${baseUrl}/${noteId + 1}/copy`)
        .set(headers);
      res.should.have.status(404);
      res.body.should.be.a('object');
      res.body.should.have.property('error')
        .which
        .is
        .an('object')
        .that
        .has
        .property('message')
        .which
        .is
        .an('string');
    });
  });

  describe(`GET ${baseUrl}/display-settings`, () => {
    it('should return config of note', async () => {
      const res = await chai.request(app)
        .get(`${baseUrl}/display-settings`)
        .set(headers);

      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.have.property('data')
        .which
        .is
        .an('object')
        .that
        .has
        .property('config')
        .which
        .is
        .an('object');
    });
  });

  describe('Non existing route', () => {
    it('should not return config of note', async () => {
      const res = await chai.request(app)
        .get('/non-existing-route')
        .set(headers);

      res.should.have.status(404);
      res.body.should.be.a('object');
      res.body.should.have.property('error')
        .which
        .is
        .an('object')
        .that
        .has
        .property('message')
        .which
        .is
        .an('string');
    });
  });
});
