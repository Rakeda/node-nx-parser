var Int64 = require('int64-native');

node = exports.node = function node(pFile, pIndex) {
	this.file = pFile;
	this.nameIdMap = {}; // name-id map
	this.children = null;
	
	if (arguments.length == 2) {
		var nodeOffset = pFile.header.node_offset + (pIndex * 20);
		var buffer = pFile.readFilePartially(nodeOffset, 20);
		this.InitFromBuffer(buffer, 0);
	}
};

exports.node.prototype = {
	InitFromBuffer: function (pBuffer, pOffset) {
		this.name_id = pBuffer.readUInt32LE(pOffset); pOffset += 4;
		this.first_child_id = pBuffer.readUInt32LE(pOffset); pOffset += 4;
		this.child_count = pBuffer.readUInt16LE(pOffset); pOffset += 2;
		this.type = pBuffer.readUInt16LE(pOffset); pOffset += 2;
		
		
		var buffer = pBuffer.slice(pOffset, pOffset + 8);
		switch (this.type) {
			case 0: break;
			case 1: // Int64
				this.data = buffer.readInt32LE(0); //new Int64(buffer.readUInt32LE(0), buffer.readUInt32LE(4));
				break;
			case 2: // Double
				this.data = buffer.readDoubleLE(0);
				break;
			case 3: // StringID
				this.data = buffer.readUInt32LE(0);
				break;
			case 4: // VectorInt32
				this.data = [buffer.readUInt32LE(0), buffer.readUInt32LE(4)];
				break;
			case 5: // Bitmap
				this.data = [buffer.readUInt32LE(0), buffer.readUInt16LE(4), buffer.readUInt16LE(6)];
				break;
			case 6: // Audio
				this.data = [buffer.readUInt32LE(0), buffer.readUInt32LE(4)];
				break;
			default: throw 'Unknown node type.';
		}
	},

	InitializeChildren: function () {
		if (this.child_count == 0 || this.children !== null) return;
		
		var buffer = this.file.readFilePartially(this.file.header.node_offset + (this.first_child_id * 20), this.child_count * 20);
		
		this.children = [];
		for (var i = 0; i < this.child_count; i++) {
			var subn = new node(this.file);
			subn.InitFromBuffer(buffer, i * 20);
			var name = this.file.get_string(subn.name_id);
			
			this.nameIdMap[name] = i;
			this.children.push(subn);
		}
	},
	GetName: function () {
		return this.file.get_string(this.name_id);
	},
	
	ChildById: function (pId) {
		if (pId < 0 || pId >= this.child_count) return null;
		this.InitializeChildren(); // Lazy Load
		
		return this.children[pId];
	},
	
	Child: function (pName) {
		this.InitializeChildren(); // Lazy Load
		
		if (this.children !== null && this.nameIdMap.hasOwnProperty(pName)) {
			return this.children[this.nameIdMap[pName]];
		}
		return null;
	},
	
	ForEach: function (pCallback) {
		for (var i = 0; i < this.child_count; i++) {
			var returnCode = pCallback(this.ChildById(i));
			if (returnCode === false) break;
		}
	},
	
	
	GetData: function () {
		if (this.type == 3) {
			return this.file.get_string(this.data);
		}
		return this.data;
	},
	
	GetPath: function (pPath) {
		// Searches for the specified path. For example, 'Tips.img/all/0' will go into Tips.img first, then all, then 0
		// Returns null if any of the nodes were not found
		var elements = pPath.split('/');
		var currentNode = this;
		
		for (var i = 0; i < elements.length; i++) {
			var nextNode = currentNode.Child(elements[i]);
			if (nextNode === null) return null;
			
			currentNode = nextNode;
		}
		
		return currentNode;
	}
};