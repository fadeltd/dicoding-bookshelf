const Hapi = require('@hapi/hapi')
const { nanoid } = require('nanoid')

const port = 5000
const host = 'localhost'
const booksData = []
const now = () => new Date().toISOString()
const logError = (err) => console.log(`${now()} [error] ${err.message}`)
const undefined = (item) => typeof item === 'undefined'

const addNewBook = (req, h) => {
  let data = { status: 'fail' }
  let code = 400
  try {
    const {
      name, year, author, summary, publisher, pageCount, readPage, reading
    } = req.payload
    if (undefined(name)) {
      data.message = 'Gagal menambahkan buku. Mohon isi nama buku'
    } else if (readPage > pageCount) {
      data.message = 'Gagal menambahkan buku. readPage tidak boleh lebih besar dari pageCount'
    } else {
      const bookId = nanoid()
      const currentTime = now()
      const newBook = {
        id: bookId,
        name,
        year,
        author,
        summary,
        publisher,
        pageCount,
        readPage,
        finished: pageCount === readPage,
        reading,
        insertedAt: currentTime,
        updatedAt: currentTime
      }
      booksData.push(newBook)
      data = { status: 'success', message: 'Buku berhasil ditambahkan', data: { bookId } }
      code = 201
    }
  } catch (err) {
    logError(err)
    data = { status: 'error', message: 'Buku gagal ditambahkan' }
    code = 500
  }
  return h.response(data).code(code)
}

const bookList = (req, h) => {
  const { name, reading, finished } = req.query
  let booksResult = booksData
  if (name) {
    booksResult = booksResult.filter((book) => new RegExp(name, 'i').test(book.name))
  }
  if (reading) {
    booksResult = booksResult.filter((book) => book.reading == reading) // eslint-disable-line eqeqeq
  }
  if (finished) {
    booksResult = booksResult.filter((book) => book.finished == finished) // eslint-disable-line eqeqeq
  }

  const data = {
    status: 'success',
    data: { books: booksResult.map((book) => { return { id: book.id, name: book.name, publisher: book.publisher } }) }
  }
  return h.response(data).code(200)
}

const findBook = (id) => booksData.find((book) => book.id === id)
const findBookIndex = (id) => booksData.findIndex((book) => book.id === id)

const bookDetail = (req, h) => {
  const book = findBook(req.params.id)
  if (book) {
    const data = { status: 'success', data: { book } }
    return h.response(data).code(200)
  }
  const data = { status: 'fail', message: 'Buku tidak ditemukan' }
  return h.response(data).code(404)
}

const updateBook = (req, h) => {
  const bookIndex = findBookIndex(req.params.id)
  const {
    name, year, author, summary, publisher, pageCount, readPage, reading
  } = req.payload
  let data = { status: 'fail' }
  let code = 400
  if (bookIndex != -1) {
    if (undefined(name)) {
      data.message = 'Gagal memperbarui buku. Mohon isi nama buku'
    } else if (readPage > pageCount) {
      data.message = 'Gagal memperbarui buku. readPage tidak boleh lebih besar dari pageCount'
    } else {
      const currentTime = now()
      const book = booksData[bookIndex]
      const newBook = {
        id: book.id,
        name,
        year: year || book.year,
        author: author || book.author,
        summary: summary || book.summary,
        publisher: publisher || book.publisher,
        pageCount: pageCount || book.pageCount,
        readPage: readPage || book.readPage,
        finished: pageCount === readPage,
        reading: reading || book.reading,
        insertedAt: book.insertedAt,
        updatedAt: currentTime
      }
      booksData[bookIndex] = newBook
      data = { status: 'success', message: 'Buku berhasil diperbarui' }
      code = 200
    }
  } else {
    data.message = 'Gagal memperbarui buku. Id tidak ditemukan'
    code = 404
  }
  return h.response(data).code(code)
}

const deleteBook = (req, h) => {
  const bookIndex = findBookIndex(req.params.id)
  if (bookIndex != -1) {
    booksData.splice(bookIndex, 1)
    const data = { status: 'success', message: 'Buku berhasil dihapus' }
    return h.response(data).code(200)
  }
  const data = { status: 'fail', message: 'Buku gagal dihapus. Id tidak ditemukan' }
  return h.response(data).code(404)
}

const routes = [
  { method: 'GET', path: '/', handler: (_, h) => h.response({ message: 'Hello World' }).code(200) },
  { method: 'POST', path: '/books', handler: addNewBook },
  { method: 'GET', path: '/books', handler: bookList },
  { method: 'GET', path: '/books/{id}', handler: bookDetail },
  { method: 'PUT', path: '/books/{id}', handler: updateBook },
  { method: 'DELETE', path: '/books/{id}', handler: deleteBook }
]

const init = async () => {
  const server = Hapi.server({ port, host, routes: { cors: { origin: ['*'] } } })
  routes.forEach((route) => server.route(route))

  server.events.on('log', (event, _) => {
    console.log(`${new Date(event.timestamp).toISOString()} [${event.tags}] ${event.data}`)
  })

  await server.start()
  server.log(['info'], `Server running on ${server.info.uri}`)

  server.events.on('response', (req) => {
    server.log(['info'], `${req.info.remoteAddress}: ${req.method.toUpperCase()} ${req.url} (${req.response.statusCode})`)
  })
}

process.on('unhandledRejection', (err) => {
  // Internal Server 500
  // process.exit(1)
  logError(err)
})

init()
