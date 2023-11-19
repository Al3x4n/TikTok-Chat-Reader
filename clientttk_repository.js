class ClientTTKRepository {  
    constructor(dao) {
      this.dao = dao
    }
  
    createTable() {
      const sql = `
        CREATE TABLE IF NOT EXISTS clientttks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          description TEXT,
          isComplete INTEGER DEFAULT 0,
          sessionttkId INTEGER,
          CONSTRAINT clientttk_fk_sessionttkId FOREIGN KEY (sessionttkId)
            REFERENCES sessionttks(id) ON UPDATE CASCADE ON DELETE CASCADE)`
      return this.dao.runquery(sql)
    }
    create(name, description, isComplete, sessionttkId) {
        return this.dao.runquery(
          `INSERT INTO clientttks (name, description, isComplete, sessionttkId)
            VALUES (?, ?, ?, ?)`,
          [name, description, isComplete, sessionttkId])
      }
      update(clientttk) {
        const { id, name, description, isComplete, sessionttkId } = clientttk
        return this.dao.runquery(
          `UPDATE clientttks
          SET name = ?,
            description = ?,
            isComplete = ?,
            sessionttkId = ?
          WHERE id = ?`,
          [name, description, isComplete, sessionttkId, id]
        )
      }
      delete(id) {
        return this.dao.runquery(
          `DELETE FROM clientttks WHERE id = ?`,
          [id]
        )
      }
      getById(id) {
        return this.dao.get(
          `SELECT * FROM clientttks WHERE id = ?`,
          [id])
      }
  }
  module.exports = ClientTTKRepository