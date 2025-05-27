/* eslint-disable no-nested-ternary */
const moment = require('moment');

// const getHours = () => {
//   const hoursPerDay = 22;
//   const time = [];
//   let formattedTime;
//   formattedTime = (moment().add(2, 'hours')).format('HH');
//   time.unshift(formattedTime);
//   formattedTime = (moment().add(1, 'hours')).format('HH');
//   time.unshift(formattedTime);
//   for (let i = 0; i < hoursPerDay; i += 1) {
//     formattedTime = (moment().subtract(i, 'hours')).format('HH');
//     time.unshift(formattedTime);
//   }
//   return time;
// };

const getDays = () => {
  const daysInWeek = 7;
  const days = [];
  let formattedDay;
  for (let i = 0; i < daysInWeek; i += 1) {
    formattedDay = (moment().subtract(i, 'days')).format('DD');
    days.unshift(formattedDay);
  }
  return days;
};

const getMonths = () => {
  const daysInMonth = 30;
  const days = [];
  let formattedDay;
  for (let i = 0; i < daysInMonth; i += 1) {
    formattedDay = (moment().subtract(i, 'days')).format('DD');
    days.unshift(formattedDay);
  }
  return days;
};

/* eslint-disable no-prototype-builtins */
const getDailyData = ({ payload }) => {
  const responseObj = {};
  for (let i = 0; i < payload.length; i += 1) {
    const hour = payload[i].DTM.split('T')[1].substring(0, 2);
    const date = payload[i].DTM.split('-')[2].substring(0, 2);
    if (!responseObj.hasOwnProperty(`${hour}`)) {
      responseObj[`${date}-${hour}`] = +(Number(payload[i].VALUE).toFixed(0));
    }
  }

  let netherlandHour = +moment().add(2, 'hours').toISOString().split('T')[1].substring(0, 2);
  let netherlandDate = +moment().add(2, 'hours').toISOString().split('-')[2].substring(0, 2);
  const netherlandPreviousDate = moment().subtract(1, 'days').toISOString().split('-')[2].substring(0, 2);

  const label = [];
  const data = [];
  while (label.length < 24) {
    label.push(netherlandHour);
    const netherlandDateString = netherlandDate.toString().length !== 1 ? `${netherlandDate}` : `0${netherlandDate}`;
    const netherlandHourString = netherlandHour.toString().length !== 1 ? `${netherlandHour}` : `0${netherlandHour}`;
    const dataValue = responseObj[`${netherlandDateString}-${netherlandHourString}`] ? responseObj[`${netherlandDateString}-${netherlandHourString}`] : 0;
    data.push(dataValue);

    netherlandHour -= 1;
    if (netherlandHour < 0) {
      netherlandHour = 23;
      netherlandDate = +netherlandPreviousDate;
    }
  }

  return {
    data: data.reverse(), label: label.reverse(),
  };
};

const getWeeklyData = ({ payload }) => {
  const responseObj = {};
  for (let i = 0; i < payload.length; i += 1) {
    const date = payload[i].DTM.split('T')[0].split('-')[2];
    if (responseObj.hasOwnProperty(`${date}`)) {
      responseObj[`${date}`].VALUE += Number(payload[i].VALUE);
      responseObj[`${date}`].count += 1;
    } else {
      responseObj[`${date}`] = {
        VALUE: Number(payload[i].VALUE),
        count: 1,
      };
    }
  }

  const days = getDays();

  const label = [];
  const data = [];
  for (let j = 0; j < 7; j += 1) {
    const day = `${days[j]}`;
    const value = responseObj[`${day}`] ? (responseObj[`${day}`].VALUE / responseObj[`${day}`].count) : 0;
    label.push(day);
    data.push(Number(value).toFixed(2));
  }

  return {
    data, label,
  };
};

const getMonthlyData = ({ payload }) => {
  const responseObj = {};
  for (let i = 0; i < payload.length; i += 1) {
    const date = payload[i].DTM.split('T')[0].split('-')[2];
    if (responseObj.hasOwnProperty(`${date}`)) {
      responseObj[`${date}`].VALUE += Number(payload[i].VALUE);
      responseObj[`${date}`].count += 1;
    } else {
      responseObj[`${date}`] = {
        VALUE: Number(payload[i].VALUE),
        count: 1,
      };
    }
  }

  const days = getMonths();

  const label = [];
  const data = [];
  for (let j = 0; j < 30; j += 1) {
    const day = `${days[j]}`;
    const value = responseObj[`${day}`] ? (responseObj[`${day}`].VALUE / responseObj[`${day}`].count) : 0;
    label.push(day);
    data.push(Number(value).toFixed(2));
  }

  return {
    data, label,
  };
};

const frameFilter = ({ payload, frame }) => {
  if (frame === 'daily') return getDailyData({ payload });
  if (frame === 'weekly') return getWeeklyData({ payload });
  if (frame === 'monthly') return getMonthlyData({ payload });
  return payload;
};

module.exports = {
  frameFilter,
};
