 window.addEventListener('load', () => {                      
	const form = document.querySelector("#new-task-form");
	const input = document.querySelector("#new-task-input");
	const list_el = document.querySelector("#tasks");
	const voiceBtn = document.querySelector("#voice-btn");
	const voiceStatus = document.querySelector("#voice-status");
	
	// Task list array to store all tasks
	const taskList = [];
	
	// Voice recognition setup
	const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
	let recognition = null;
	let isListening = false;
	
	if (SpeechRecognition) {
		recognition = new SpeechRecognition();
		recognition.continuous = false;
		recognition.lang = 'en-US';
		recognition.interimResults = false;
		
		recognition.onstart = () => {
			isListening = true;
			voiceBtn.innerText = "🔴 Stop Voice";
			voiceStatus.innerText = "Listening... Say 'add task [name]', 'delete task [number]', 'complete task [number]', 'edit task [number]', 'change task [number] to [new text]', or 'undo task [number]'";
		};
		
		recognition.onresult = (event) => {
			const transcript = event.results[0][0].transcript.toLowerCase();
			voiceStatus.innerText = `Heard: "${transcript}"`;
			console.log('Voice transcript:', transcript); // Debug log
			
			if (transcript.includes("add task") || transcript.includes("new task")) {
				const taskText = transcript.replace(/add task|new task/g, "").trim();
				if (taskText) {
					addTaskViaVoice(taskText);
					voiceStatus.innerText = `Added task: "${taskText}"`;
				}
			} else if (transcript.includes("change task") || transcript.includes("update task") || transcript.includes("modify task")) {
				// Handle multiple variations: "change task X to Y", "update task X to Y", etc.
				const toIndex = transcript.indexOf(" to ");
				if (toIndex !== -1) {
					const beforeTo = transcript.substring(0, toIndex); // "change task [number]"
					const afterTo = transcript.substring(toIndex + 4).trim(); // "[new text]"
					
					// Extract number from the first part
					const numbers = beforeTo.match(/\d+/);
					if (numbers && afterTo) {
						const taskNumber = parseInt(numbers[0]) - 1;
						console.log(`Changing task ${taskNumber + 1} to: "${afterTo}"`); // Debug log
						changeTaskViaVoice(taskNumber, afterTo);
					}
				}
			} else if (transcript.includes("delete task")) {
				const words = transcript.split(" ");
				const numIndex = words.findIndex(word => !isNaN(parseInt(word)));
				if (numIndex !== -1) {
					const num = parseInt(words[numIndex]) - 1;
					deleteTaskViaVoice(num);
				}
			} else if (transcript.includes("mark task") || transcript.includes("complete task")) {
				const words = transcript.split(" ");
				const numIndex = words.findIndex(word => !isNaN(parseInt(word)));
				if (numIndex !== -1) {
					const num = parseInt(words[numIndex]) - 1;
					markTaskDoneViaVoice(num);
				}
			} else if (transcript.includes("edit task")) {
				const words = transcript.split(" ");
				const numIndex = words.findIndex(word => !isNaN(parseInt(word)));
				if (numIndex !== -1) {
					const num = parseInt(words[numIndex]) - 1;
					editTaskViaVoice(num);
				}
			} else if (transcript.includes("undo task")) {
				const words = transcript.split(" ");
				const numIndex = words.findIndex(word => !isNaN(parseInt(word)));
				if (numIndex !== -1) {
					const num = parseInt(words[numIndex]) - 1;
					undoTaskViaVoice(num);
				}
			}
		};
		
		recognition.onerror = (event) => {
			console.error('Speech recognition error:', event.error);
			voiceStatus.innerText = `Error: ${event.error}`;
			isListening = false;
			voiceBtn.innerText = "🎤 Start Voice";
		};
		
		recognition.onend = () => {
			isListening = false;
			voiceBtn.innerText = "🎤 Start Voice";
			if (voiceStatus.innerText.includes("Listening")) {
				voiceStatus.innerText = "Voice recognition stopped. Press Ctrl+Space or click microphone to start again.";
			}
		};
		
		// Voice button event listener
		voiceBtn.addEventListener('click', () => {
			if (isListening) {
				stopListening();
			} else {
				startListening();
			}
		});
	} else {
		voiceBtn.style.display = 'none';
		voiceStatus.innerText = "Voice recognition not supported in this browser.";
	}

	form.addEventListener('submit', (e) => {
		e.preventDefault();                     

		const task = input.value.trim();
		if (!task) return;

		addTask(task);
		input.value = '';
	});

	// Voice recognition functions
	function addTaskViaVoice(taskText) {
		addTask(taskText);
	}

	function deleteTaskViaVoice(index) {
		if (taskList[index]) {
			voiceStatus.innerText = `Deleted task ${index + 1}: "${taskList[index].text}"`;
			taskList.splice(index, 1);
			renderTasks();
		} else {
			voiceStatus.innerText = `Task ${index + 1} not found`;
		}
	}

	function markTaskDoneViaVoice(index) {
		if (taskList[index]) {
			taskList[index].done = !taskList[index].done;
			const status = taskList[index].done ? "completed" : "uncompleted";
			voiceStatus.innerText = `Task ${index + 1} marked as ${status}`;
			renderTasks();
		} else {
			voiceStatus.innerText = `Task ${index + 1} not found`;
		}
	}

	function editTaskViaVoice(index) {
		if (taskList[index]) {
			// Find the task element and trigger edit mode
			const taskElements = document.querySelectorAll('.task');
			if (taskElements[index]) {
				const editButton = taskElements[index].querySelector('.edit');
				const textInput = taskElements[index].querySelector('.text');
				
				// Simulate clicking the edit button
				editButton.innerText = "Save";
				textInput.removeAttribute("readonly");
				textInput.focus();
				textInput.select(); // Select all text for easy editing
				
				voiceStatus.innerText = `Task ${index + 1} is now in edit mode. Type your changes and press Enter or click Save.`;
				
				// Add Enter key listener for quick save
				const saveOnEnter = (e) => {
					if (e.key === 'Enter') {
						editButton.innerText = "Edit";
						textInput.setAttribute("readonly", "readonly");
						taskList[index].text = textInput.value;
						voiceStatus.innerText = `Task ${index + 1} updated to: "${textInput.value}"`;
						textInput.removeEventListener('keydown', saveOnEnter);
					}
				};
				textInput.addEventListener('keydown', saveOnEnter);
			}
		} else {
			voiceStatus.innerText = `Task ${index + 1} not found`;
		}
	}

	function undoTaskViaVoice(index) {
		if (taskList[index]) {
			if (taskList[index].done) {
				taskList[index].done = false;
				voiceStatus.innerText = `Task ${index + 1} unmarked as completed`;
				renderTasks();
			} else {
				voiceStatus.innerText = `Task ${index + 1} is already not completed`;
			}
		} else {
			voiceStatus.innerText = `Task ${index + 1} not found`;
		}
	}

	function changeTaskViaVoice(index, newText) {
		console.log(`Attempting to change task at index ${index} to: "${newText}"`); // Debug log
		console.log(`Task list length: ${taskList.length}`); // Debug log
		
		if (taskList[index]) {
			const oldText = taskList[index].text;
			taskList[index].text = newText;
			voiceStatus.innerText = `Task ${index + 1} changed from "${oldText}" to "${newText}"`;
			renderTasks();
		} else {
			voiceStatus.innerText = `Task ${index + 1} not found. You have ${taskList.length} tasks.`;
		}
	}

	// Main task functions
	function addTask(taskText) {
		const taskObj = {
			text: taskText,
			done: false,
			id: Date.now() // unique identifier
		};
		
		taskList.push(taskObj);
		renderTasks();
	}

	function renderTasks() {
		list_el.innerHTML = '';
		
		taskList.forEach((taskObj, index) => {
			const task_el = document.createElement('div');
			task_el.classList.add('task');
			if (taskObj.done) {
				task_el.classList.add('completed');
			}

			const task_content_el = document.createElement('div');
			task_content_el.classList.add('content');

			task_el.appendChild(task_content_el);

			// Add task number
			const task_number_el = document.createElement('span');
			task_number_el.classList.add('task-number');
			task_number_el.innerText = `${index + 1}.`;
			task_content_el.appendChild(task_number_el);

			const task_input_el = document.createElement('input');
			task_input_el.classList.add('text');
			task_input_el.type = 'text';
			task_input_el.value = taskObj.text;
			task_input_el.setAttribute('readonly', 'readonly');

			task_content_el.appendChild(task_input_el);

			const task_actions_el = document.createElement('div');
			task_actions_el.classList.add('actions');

			const task_edit_el = document.createElement('button');
			task_edit_el.classList.add('edit');
			task_edit_el.innerText = 'Change';

			const task_delete_el = document.createElement('button');
			task_delete_el.classList.add('delete');
			task_delete_el.innerText = 'Delete';
			
			const task_complete_el = document.createElement('button');
			task_complete_el.classList.add('complete');
			task_complete_el.innerText = taskObj.done ? 'Undo' : 'Complete';

			task_actions_el.appendChild(task_edit_el);
			task_actions_el.appendChild(task_complete_el);
			task_actions_el.appendChild(task_delete_el);

			task_el.appendChild(task_actions_el);

			list_el.appendChild(task_el);

			// Event listeners for buttons
			task_edit_el.addEventListener('click', (e) => {
				if (task_edit_el.innerText.toLowerCase() == "change") {
					task_edit_el.innerText = "Save";
					task_input_el.removeAttribute("readonly");
					task_input_el.focus();
				} else {
					task_edit_el.innerText = "Change";
					task_input_el.setAttribute("readonly", "readonly");
					// Update the task in the array
					taskList[index].text = task_input_el.value;
				}
			});

			task_complete_el.addEventListener('click', (e) => {
				taskList[index].done = !taskList[index].done;
				renderTasks();
			});

			task_delete_el.addEventListener('click', (e) => {
				taskList.splice(index, 1);
				renderTasks();
			});
		});
	}

	// Voice recognition controls
	function startListening() {
		if (recognition && !isListening) {
			isListening = true;
			recognition.start();
		}
	}

	function stopListening() {
		if (recognition && isListening) {
			recognition.stop();
			isListening = false;
		}
	}

	// Keyboard shortcut for voice recognition (Space key)
	document.addEventListener('keydown', (e) => {
		if (e.code === 'Space' && e.ctrlKey) {
			e.preventDefault();
			if (isListening) {
				stopListening();
			} else {
				startListening();
			}
		}
	});
});
