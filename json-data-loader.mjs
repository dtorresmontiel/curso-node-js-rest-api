import fs from 'node:fs/promises';

const findAll = async (dataFile) => {
  return fs.readFile(dataFile).then(data => JSON.parse(data))
    .catch(reason => {
      return Promise.reject(new Error(`Error reading file ${dataFile} : ${reason}`));
    });
};

const findById = async (id, dataFile) => {
  return findAll(dataFile)
    .then(data => data.find(item => item.id === id))
    .then(found =>
      found ? Promise.resolve(found) : Promise.reject(new Error('not_found'))
    );
};

const findByField = async (fieldname, value, dataFile) => {
  return findAll(dataFile)
    .then(data => data.find(item => item[fieldname] === value))
    .then(found => found ? Promise.resolve(found) : Promise.reject(new Error('not_found')));
};

const findByCollectionField = async (fieldname, value, dataFile) => {
  return findAll(dataFile)
    // .then(data => data.filter(item => item[fieldname].includes(value)))
    .then(data => // using "some" for case-insensitive instead of "includes"
      data.filter(item => item[fieldname].some(item => item.toLowerCase() === value.toLowerCase()))
    )
    .then(found => found.length ? Promise.resolve(found) : Promise.reject(new Error('not_found')));
};

const saveDataToFile = (data, dataFile) => fs.writeFile(dataFile, JSON.stringify(data, null, 2));

const insertNew = async (newEntry, dataFile) => {
  return findByField('title', newEntry.title, dataFile)
    .then(() => { throw new Error('duplicate_entry'); })
    .catch(async error => {
      if (error.message === 'duplicate_entry') { return Promise.reject(error); }
      return findAll(dataFile)
        .then(data => { data.push(newEntry); return data; })
        .then(data => saveDataToFile(data, dataFile))
        .then(() => newEntry);
    }
    );
};

const persistEntry = async (entryData, dataFile) => {
  return findAll(dataFile)
    .then(data => {
      const foundIndex = data.findIndex(item => item.id === entryData.id);
      if (foundIndex === -1) {
        return Promise.reject(new Error('not_found'));
      }
      data[foundIndex] = entryData;
      return data;
    })
    .then(updatedData => saveDataToFile(updatedData, dataFile))
    .then(() => entryData);
};

const deleteEntryById = async (id, dataFile) => {
  return findAll(dataFile)
    .then(data => {
      const foundIndex = data.findIndex(item => item.id === id);
      if (foundIndex === -1) {
        return Promise.reject(new Error('not_found'));
      }
      data.splice(foundIndex, 1);
      return data;
    })
    .then(remainingData => saveDataToFile(remainingData, dataFile));
};

export { findAll, findById, findByField, findByCollectionField, insertNew, persistEntry, deleteEntryById };
