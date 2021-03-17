const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(request, response, next) {
  const { username } = request.headers;

  const UsernameExist = users.find((user) => user.username === username);

  if(!UsernameExist){
    return response.status(404).json({ error: "Username not found!" })
  }

  request.user = UsernameExist;

  return next();
}

function checksCreateTodosUserAvailability(request, response, next) {
  const user = request.user;

  if (!user.pro && user.todos.length >= 10) {
    return response.status(403).json({ error: "Limit of 10 Todos reached! Buy the Pro Plan to continue." })
  }

  return next();

}

function checksTodoExists(request, response, next) {
  const { username } = request.headers;
  const { id } = request.params;

  const UserExist = users.find((user) => user.username === username);

  if(!UserExist){
    return response.status(404).json({ error: "Username not found!" })
  }

  if (!validate(id)) {
    return response.status(400).json({ error: "This id is not a UUID" })
  }

  const todoExist = UserExist.todos.find((todo) => todo.id === id)

  if(!todoExist){
    return response.status(404).json({ error: "Id not found!" })
  }

  request.user = UserExist;
  request.todo = todoExist;

  return next();
}

function findUserById(request, response, next) {
  const { id } = request.params;

  const userExist = users.find((user) => user.id === id);

  if(!userExist){
    return response.status(404).json({ error: "Id not found!" })
  }

  request.user = userExist;

  return next();
}

app.post('/users', (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some((user) => user.username === username);

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(user);

  return response.status(201).json(user);
});

app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
  const { title, deadline } = request.body;
  const { user } = request;

  const newTodo = {
    id: uuidv4(),
    title,
    deadline: new Date(deadline),
    done: false,
    created_at: new Date()
  };

  user.todos.push(newTodo);

  return response.status(201).json(newTodo);
});

app.put('/todos/:id', checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { user, todo } = request;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1);

  return response.status(204).send();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};