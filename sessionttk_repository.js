class SessionTTKRepository { 
    constructor(dao) {      //Đểkhởi tạo một đối tượng từ class SessionTTKRepository chúng ta cần truyền một đối tượng AppDAO cho nó
      this.dao = dao
    }
  
    createTable() {   //Hàm tạo bảng này sẽ dùng để tạo ra cấu trúc bảng sessionttks nếu trong file csdl sqlite3 chưa có bảng này.
      const sql = `
      CREATE TABLE IF NOT EXISTS sessionttks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT)`
      return this.dao.runquery(sql)
    }
    create(name) {
        return this.dao.runquery(
          'INSERT INTO sessionttks (name) VALUES (?)',
          [name])
      }
      update(sessionttk) {
        const { id, name } = sessionttk
        return this.dao.runquery(
          `UPDATE sessionttks SET name = ? WHERE id = ?`,
          [name, id]
        )
      }
      delete(id) {
        return this.dao.runquery(
          `DELETE FROM sessionttks WHERE id = ?`,
          [id]
        )
      }
      getById(id) {
        return this.dao.get(
          `SELECT * FROM sessionttks WHERE id = ?`,
          [id])
      }
      getAll() {
        return this.dao.all(`SELECT * FROM sessionttks`)
      }
      getClientInSession(sessionttkId) {
        return this.dao.all(
          `SELECT * FROM clientttks WHERE sessionttkId = ?`,
          [sessionttkId])
      }
  }
  module.exports = SessionTTKRepository
